# PHIẾU MÔ TẢ ĐỀ TÀI ĐỒ ÁN TỐT NGHIỆP

Tài liệu này được soạn theo cấu trúc của mẫu “Phiếu giao nhiệm vụ đồ án tốt nghiệp hệ cử nhân” được cung cấp. Các trường thông tin cá nhân, thời gian và người hướng dẫn để trống để điền theo hồ sơ chính thức.

## Thông tin về sinh viên

- Họ và tên sinh viên: ........................................................
- MSSV: ........................................................................
- Điện thoại liên lạc: ..........................................................
- Lớp: ...........................................................................
- Email: .........................................................................
- Mã lớp: ........................................................................

## Thông tin giáo viên hướng dẫn

- Họ và tên giáo viên hướng dẫn: .................................................
- Đồ án được thực hiện tại: ......................................................
- Thời gian làm đồ án: Từ ngày ......................... đến ngày ................

## 1. Tên đề tài

**Xây dựng hệ thống đặt vé sự kiện trực tuyến.**

Tên tiếng Anh tham khảo:

**Building an Online Event Ticketing System.**

## 2. Lĩnh vực đề tài

- **Lựa chọn 1:** Phát triển phần mềm doanh nghiệp và hệ thống phân tán.
- **Lựa chọn 2:** Phát triển ứng dụng web và ứng dụng di động.
- **Lựa chọn 3:** Điện toán đám mây, DevOps và triển khai hệ thống trên Kubernetes.
- **Lĩnh vực bổ sung:** Thương mại điện tử, thanh toán trực tuyến, xử lý sự kiện và bảo mật ứng dụng.

## 3. Mục tiêu của đồ án

### 3.1. Kiến thức sinh viên thu thập được

- Phân tích bài toán, yêu cầu và quy trình bán vé sự kiện trực tuyến.
- Thiết kế kiến trúc microservices, cơ sở dữ liệu riêng và hệ thống chịu tải cao.
- Áp dụng waiting room, atomic inventory, outbox và event-driven architecture để hạn chế oversell.
- Tìm hiểu bảo mật, thanh toán, check-in, AWS, Kubernetes và giám sát hệ thống.

### 3.2. Công nghệ sinh viên thu thập được

- React/TypeScript, Tailwind CSS cho ứng dụng web.
- Node.js/Express, REST API, OpenAPI, JWT và microservices.
- MongoDB, Redis, RabbitMQ, Docker, VNPay/MoMo và QR/barcode.
- AWS, Kubernetes, Terraform, GitHub Actions, Argo CD, Grafana và Prometheus.

### 3.3. Kỹ năng sinh viên phát triển được

- Phân tích yêu cầu, thiết kế kiến trúc, cơ sở dữ liệu và API.
- Phát triển ứng dụng web và backend theo mô hình microservices.
- Tích hợp thanh toán, email, QR/barcode, CI/CD và triển khai cloud.
- Kiểm thử, đánh giá hiệu năng, xử lý sự cố và viết tài liệu kỹ thuật.

### 3.4. Sản phẩm kỳ vọng

- Website cho xem sự kiện, mua vé, thanh toán và quản lý vé.
- Hệ thống quản trị cho sự kiện, loại vé, tồn kho, booking và người dùng.
- Hàng chờ ảo, microservice booking, thanh toán, email và check-in QR/barcode.
- Hệ thống triển khai trên AWS Kubernetes, có CI/CD, giám sát và tài liệu kỹ thuật.

### 3.5. Vấn đề thực tiễn đồ án giải quyết

- Giảm nghẽn hệ thống khi lượng truy cập tăng đột biến nhờ hàng chờ ảo và rate limit.
- Hạn chế bán vượt vé, booking trùng và thanh toán lặp bằng inventory atomic và idempotency.
- Cung cấp vé QR/barcode và quy trình check-in nhanh, chính xác tại sự kiện.
- Hỗ trợ mở rộng, giám sát và vận hành độc lập các thành phần của hệ thống.

## 4. Các nội dung sẽ thực hiện và kế hoạch triển khai

Kế hoạch tham khảo 17 tuần và có thể điều chỉnh theo lịch của nhà trường:

| Nội dung | Thời gian | Công việc chính |
|---|---|---|
| Tìm hiểu bài toán | Tuần 1–2 | Khảo sát nền tảng bán vé, người dùng, quy trình mua vé/check-in và rủi ro hot sale. |
| Tìm hiểu công nghệ | Tuần 3–4 | Nghiên cứu web, microservices, MongoDB, Redis, RabbitMQ, Docker, AWS và Kubernetes. |
| Phân tích và thiết kế | Tuần 5–7 | Thiết kế kiến trúc, database, API, waiting room, token, giao diện và hạ tầng triển khai. |
| Xây dựng chương trình | Tuần 7–14 | Xây dựng frontend web, các microservice, thanh toán, check-in, email, CI/CD và monitoring. |
| Kiểm thử và đánh giá | Tuần 13–16 | Kiểm thử unit/API/E2E, load test hot sale, bảo mật, HPA, thanh toán và thiết bị check-in. |
| Hoàn thiện báo cáo | Tuần 16–17 | Hoàn thiện tài liệu, sơ đồ, dữ liệu demo, slide và môi trường trình diễn. |

## 5. Tiêu chí đánh giá sản phẩm

- Người dùng có thể đăng ký/đăng nhập, xem sự kiện, chọn vé và tạo booking.
- Hàng chờ hoạt động khi bật cấu hình; client nhận được vị trí và admission token.
- Không oversell trong bài kiểm thử đồng thời đã định nghĩa.
- Token admission được kiểm tra chữ ký, thời hạn, người dùng và event.
- Payment webhook xử lý idempotent và không làm cập nhật trạng thái nhiều lần.
- Vé có mã xác thực riêng và check-in không lặp.
- Website dùng API contract và xử lý lỗi đúng.
- Mỗi service build/deploy được độc lập; CI/CD có test, audit, scan và rollback.
- K8s có health check, HPA, PDB, NetworkPolicy và metrics cơ bản.
- Tài liệu, sơ đồ, source code và demo có thể tái hiện theo hướng dẫn.

## 6. Lời cam đoan của sinh viên

Em xin cam kết sẽ thực hiện các nội dung của đề tài theo kế hoạch đã thống nhất, trung thực trong việc báo cáo kết quả, ghi rõ nguồn tham khảo và chịu trách nhiệm về phần công việc được giao.

Hà Nội, ngày ........ tháng ........ năm ........

**Sinh viên**

(Ký và ghi rõ họ tên)

........................................................

## 7. Xác nhận của giáo viên hướng dẫn

Hà Nội, ngày ........ tháng ........ năm ........

**Giảng viên hướng dẫn**

(Ký và ghi rõ họ tên)

........................................................

## 8. Ghi chú về phạm vi hiện tại

- Tài liệu mô tả kiến trúc và source code hiện có, trong đó Redis managed là tùy chọn ở môi trường AWS để kiểm soát chi phí.
- `WAITING_ROOM_ENABLED=true` yêu cầu Redis hoạt động; nếu dependency không sẵn sàng, readiness của waiting-room fail-closed.
- Ứng dụng mobile và NFC được tạm thời loại khỏi phạm vi; QR/barcode là phương thức check-in chính.
- Cloudflare, AWS, MongoDB Atlas, VNPay/MoMo, SES, Argo CD và monitoring cần secret, credential và cấu hình môi trường thật trước khi demo production.
- Các giới hạn của admission token, Redis HA, zone spread và runtime secret sync được trình bày trong [tài liệu AZ và phân phối token](AZ_AND_TOKEN_FLOWS.md).
