# Hạ tầng và dự tính chi phí TicketStage

## Mục tiêu

TicketStage là hệ thống bán vé theo microservices, ưu tiên chống oversell, khả năng mở rộng cho đợt mở bán và chi phí phù hợp cho đồ án dùng AWS credit. Cấu hình hạ tầng hiện nằm tại repository `ticket-infra`; file này là tài liệu tham chiếu tập trung cho kiến trúc và quyết định chi phí.

Giá dưới đây là ước tính cho `us-east-1`, khoảng 730 giờ/tháng, chưa gồm thuế, data transfer, LCU, log vượt quota và các khoản theo lưu lượng. Phải chốt bằng AWS Pricing Calculator trước khi apply.

## Kiến trúc tổng quan

```text
Khán giả web/mobile
  -> Cloudflare DNS, DDoS, WAF, Turnstile, rate limit
  -> CloudFront + S3 (frontend) / ALB Ingress (API)
  -> EKS
       -> api-gateway
       -> auth, catalog, booking, checkin, notification services
       -> HPA/KEDA, PDB, NetworkPolicy, Prometheus/Grafana
  -> MongoDB Atlas (mỗi service sở hữu database)
  -> Amazon MQ RabbitMQ (outbox/event bus)
  -> AWS Secrets Manager -> External Secrets -> Kubernetes Secret
  -> CloudWatch, OpenTelemetry Collector, Prometheus, Grafana, Alertmanager
```

## Thành phần cần thiết

| Lớp | Thành phần | Bắt buộc cho đồ án | Ghi chú chi phí/thiết kế |
| --- | --- | --- | --- |
| Edge | Cloudflare DNS, WAF rules, Turnstile | Có | Dùng Free plan khi đủ tính năng; Bot Management/Waiting Room phụ thuộc entitlement trả phí. |
| Web | S3 + CloudFront | Có | Static frontend rẻ, cache tốt; không chạy frontend bằng pod. |
| API | ALB do AWS Load Balancer Controller tạo | Có khi public API | ALB có phí giờ và LCU; chỉ giữ một ALB dùng chung ingress. |
| Compute | EKS + Managed Node Groups arm64 | Có nếu cần thể hiện Kubernetes | Dùng Graviton `t4g`/`m7g`; system on-demand, app Spot. |
| Network | VPC, public/private subnet, security groups | Có | Dùng ít AZ ở dev để giảm chi phí. |
| Egress | NAT Gateway | Không nên bật 2 NAT ở dev | Đây là chi phí nền lớn nhất sau EKS. |
| Database | MongoDB Atlas M0 | Có cho demo | M0 miễn phí nhưng không có Private Endpoint/PITR và hạn chế hiệu năng. |
| Event bus | Amazon MQ RabbitMQ | Tùy mục tiêu demo | Cần cho outbox/event; local dùng RabbitMQ Docker. |
| Registry | ECR | Có | Lifecycle policy xóa image cũ, giữ SHA/tag release cần thiết. |
| Secret | AWS Secrets Manager + External Secrets | Nên có | Không truyền secret thật qua GitOps manifest. |
| Observability | CloudWatch + Prometheus/Grafana + OpenTelemetry | Có mức tối thiểu | Giảm retention log ở dev; không cần HA Alertmanager cho đồ án. |
| CI/CD | GitHub Actions, ECR, Argo CD | Có | Terraform pipeline chỉ manual apply/destroy; app pipeline chỉ build/deploy GitOps. |

## Cấu hình hiện tại và các rủi ro chi phí

Các file `ticket-infra/aws/terraform/environments/dev/terraform.tfvars` và `prod/terraform.tfvars` đang tạo:

- Một EKS cluster cho mỗi environment.
- Hai AZ và hai NAT Gateway cho mỗi environment.
- Một system node `t4g.small` on-demand và một app node `t4g.small` Spot.
- MongoDB Atlas M0.
- Amazon MQ `mq.t3.micro` single instance.

Điểm cần sửa trước khi apply mới: `mq.t3.micro` đã bị AWS ngừng cho tạo broker RabbitMQ mới và các broker hiện có hết hỗ trợ ngày 01-10-2026. Chọn `mq.m7g.medium` cho evaluation hoặc tạm thời dùng RabbitMQ tự host/local cho demo. `mq.m7g.medium` có chi phí đáng kể hơn; không bật khi chưa cần trình diễn event broker managed.

## Ước tính chi phí theo thành phần

| Thành phần | Công thức tham chiếu | Ước tính/tháng | Nhận xét |
| --- | --- | --- | --- |
| EKS control plane | `$0.10 x 730 giờ` | khoảng `$73` | Tính theo từng cluster, chưa gồm node. |
| 2 NAT Gateway | `2 x $0.045 x 730 giờ` | khoảng `$65.70` + `$0.045/GB` | Đang có trong dev và prod; chi phí chạy cả khi không có traffic. |
| 1 NAT Gateway | `$0.045 x 730 giờ` | khoảng `$32.85` + data | Phương án dev tiết kiệm, đánh đổi HA egress. |
| ALB | `$0.0225 x 730 giờ` + LCU | từ khoảng `$16.43` + LCU | Một ALB shared cho toàn bộ route API. |
| Node EKS | EC2/EBS theo giờ | biến động | Giữ 1 system on-demand; app node Spot. Kiểm tra Spot availability trước hot sale. |
| MongoDB Atlas M0 | Free tier | `$0` | Chỉ phù hợp demo/dev; không đạt SLA production. |
| Amazon MQ `mq.t3.micro` | Free tier legacy | có thể `$0` năm đầu nếu đủ điều kiện | Không dùng cho broker mới vì đã deprecated. |
| S3/CloudFront/ECR/CloudWatch | storage, request, transfer, log | thấp khi demo | Vẫn cần budget alarm vì log/image/lưu lượng có thể tăng. |

Nguồn chính thức: [AWS EKS pricing](https://aws.amazon.com/eks/pricing/), [AWS VPC/NAT pricing](https://aws.amazon.com/vpc/pricing/), [Elastic Load Balancing pricing](https://aws.amazon.com/elasticloadbalancing/pricing/), [Amazon MQ RabbitMQ instance support](https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/rmq-broker-instance-types.html), [AWS Pricing Calculator](https://calculator.aws/).

## Kế hoạch dùng AWS credit 200 USD

### Khuyến nghị thực tế

1. Chỉ chạy **một environment AWS tại một thời điểm**. Dùng `dev` cho demo, destroy sau khi hoàn thành; không chạy đồng thời dev, staging và prod.
2. Đổi dev sang **một NAT Gateway** hoặc tắt NAT khi không test private egress. Hai NAT đã tốn gần `$66/tháng` trước traffic.
3. Chỉ bật EKS trong giai đoạn cần demo Kubernetes. EKS control plane tự nó khoảng `$73/tháng`.
4. Không tạo Amazon MQ managed nếu chưa cần demo broker managed. RabbitMQ Docker/local hoặc một deployment RabbitMQ trong dev EKS rẻ hơn nhưng không có HA.
5. Atlas dùng M0; không bật Private Endpoint, PITR, Multi-AZ hay staging M20 trong giai đoạn credit `$200`.
6. Đặt AWS Budgets ở ngưỡng `$25`, `$50`, `$100`, `$150`, `$180` và email/SNS alert. Luôn dùng Cost Explorer theo service trước khi tạo thêm tài nguyên.
7. Giảm CloudWatch retention dev xuống 1-3 ngày, đặt ECR lifecycle giữ 5-10 image gần nhất, không ghi access log quá chi tiết khi không debug.

### Ba lựa chọn ngân sách

| Mô hình | Chi phí định hướng | Khi dùng |
| --- | --- | --- |
| Local-first | gần `$0` AWS | Code, test, demo nội bộ bằng Docker Compose/Expo. |
| EKS demo tối giản | thường khoảng `$120-170/tháng` trước traffic | Một EKS, một NAT, một ALB, node nhỏ, Atlas M0; chỉ chạy trong thời gian demo. |
| Cấu hình Terraform hiện tại dev/prod | trên `$150/tháng` cho mỗi environment trước node/ALB/data | Không phù hợp chạy lâu với credit `$200`, đặc biệt nếu bật cả dev và prod. |

Con số là suy luận từ cấu hình hiện tại và bảng giá công khai; chi phí thực tế thay đổi theo traffic, EBS, public IPv4, data transfer, log và Spot availability.

## HA, HPA và hot sale

- `catalog-service` dùng atomic update inventory; reserved seat dùng seat lock TTL. Booking phải có `inventoryReservationId` để release idempotent.
- HPA scale pod theo CPU/memory; KEDA scale worker theo queue depth RabbitMQ.
- `booking-service` có PDB, topology spread/anti-affinity và critical path nên luôn có capacity on-demand tối thiểu trong môi trường production thật.
- Với đồ án/credit nhỏ: không tuyên bố HA production. Một node, một NAT, Atlas M0 và MQ single instance đều có single point of failure.
- Trước đợt mở bán mô phỏng: chạy k6 hot-sale test, kiểm tra p95/p99 reserve inventory, HPA scale, queue depth, outbox pending và booking failure rate.

## Hot-sale inventory và rate limit

Với event có traffic cao, ticket có thể dùng `inventoryMode: "buckets"`. Inventory
được chia thành nhiều document `InventoryBucket`, mỗi reserve/release chỉ ghi
atomic vào bucket thay vì dồn vào một document `Ticket`. Chạy
`npm run db:migrate-inventory-buckets` sau khi review phạm vi event; chạy
`npm run db:sync-inventory-buckets` định kỳ để cập nhật số liệu denormalized
cho màn hình public.

Rate limit local có thể dùng Redis trong Docker Compose. Trên AWS, chỉ đặt
`RATE_LIMIT_STORE=redis` sau khi có Redis/ElastiCache và nạp `REDIS_URL` qua
Secret Manager/External Secrets. Nếu chưa có Redis managed, giữ `mongo` để
không tạo thêm chi phí ngoài dự toán, nhưng không coi đây là cấu hình cho
peak traffic hàng nghìn request/giây.

## Secrets và cấu hình runtime

- GitHub Secrets chỉ dùng cho quyền CI/CD và input Terraform.
- Secret runtime (`JWT_SECRET`, Mongo URIs, RabbitMQ, SMTP, VNPay/MoMo, Turnstile) đặt tại AWS Secrets Manager.
- External Secrets Operator đồng bộ sang `ticketstage-secrets`; pod chỉ đọc đúng key cần thiết qua `secretKeyRef`.
- ConfigMap chỉ chứa cấu hình không nhạy cảm như URL service, timeout, rate limit, queue setting và OpenTelemetry.
- Danh sách tên biến chi tiết: `DEPLOYMENT_VARIABLES.local.md` trong cùng thư mục, file cục bộ bị Git ignore.

## Quy trình triển khai và hủy hạ tầng

```text
Apply:   00-networking -> 01-kubernetes -> 02-data -> 03-storage -> 04-observability -> Cloudflare
Destroy: Cloudflare -> 04-observability -> 03-storage -> 02-data -> 01-kubernetes -> 00-networking
```

- Infra CI chỉ tự validate/audit khi push/PR; `plan`, `apply`, `destroy` chạy manual qua `workflow_dispatch`.
- App CI build image theo service, tag `environment-shortSHA`, cập nhật Kustomize overlay; Argo CD đồng bộ desired state.
- Trước destroy phải backup dữ liệu cần giữ, kiểm tra CloudFront/S3, xóa Argo applications/workloads trước khi destroy EKS và xác nhận không còn NAT/EIP/ALB tính phí.

## Checklist trước lần apply đầu tiên

- [ ] Tạo AWS Budget và Cost Anomaly Detection.
- [ ] Chọn duy nhất một environment cần chạy.
- [ ] Cập nhật `mq.t3.micro` trước khi tạo Amazon MQ mới.
- [ ] Kiểm tra Terraform plan, đặc biệt số NAT Gateway, node desired/min và ALB.
- [ ] Cấu hình GitHub Environments `dev`, `staging`, `prod` cùng OIDC role tách quyền.
- [ ] Đưa runtime secret vào AWS Secrets Manager, không đưa giá trị vào GitHub log hay Git.
- [ ] Bootstrap External Secrets, metrics-server, Argo CD, Prometheus/Grafana trước deploy app.
- [ ] Test `/health/live`, `/health/ready`, `/health/dependencies`, HPA và rollback image.
