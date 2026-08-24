# STEER - Dinh Huong Va Tieu Chi Du An TicketStage

Tai lieu nay la kim chi nam hien tai cho du an TicketStage. Khi co yeu cau moi, refactor, them tinh nang, sua loi, hoac thay doi ha tang, hay doi chieu voi file nay truoc de tranh lech huong.

## 1. Tam Nhin San Pham

TicketStage la nen tang dat ve su kien theo huong san pham thuc chien, phuc vu ca web, mobile va nhan vien van hanh cong vao.

Muc tieu chinh:

- Khach hang xem su kien, chon ve, dat ve, thanh toan va nhan ve dien tu.
- Moi ve cua khach phai co dinh danh rieng, gom QR, barcode va NFC payload khi thiet bi ho tro.
- Nhan vien co the check-in bang QR, barcode, NFC hoac nhap ma thu cong.
- Admin va organizer quan ly cong ty, su kien, loai ve, don dat ve, thanh toan, thong ke va van hanh.
- He thong phai san sang cho cac dot mo ban concert co luu luong cao.

Uu tien san pham:

- Khong oversell ve.
- Luong mua ve nhanh, ro rang, it ma sat.
- Check-in chinh xac, chong quet trung, hoat dong tot tai cong vao.
- Bao mat token, QR/NFC payload, mat khau va secret.
- De deploy, de quan sat, de rollback tung service.

## 2. Kien Truc Tong The

Du an hien di theo kien truc microservices.

Backend gom cac service chinh:

- `api-gateway`: public entrypoint cho web va mobile.
- `auth-service`: dang ky, dang nhap, user, role, admin API.
- `catalog-service`: company, event, ticket, inventory, seat lock.
- `booking-service`: booking, payment, pass, booking hold, expiration, outbox.
- `checkin-service`: validate ve, check-in, device, log, projection rieng.
- `notification-service`: email queue, email log, template, reminder, campaign.

Nguyen tac:

- Moi service so huu database/domain cua minh.
- Khong query truc tiep database cua service khac.
- Khong import model nghiep vu cua service khac cho runtime logic.
- Du lieu cross-service phai di qua internal API, event, snapshot hoac projection.
- API public di qua `api-gateway`.
- Internal API phai duoc bao ve bang `INTERNAL_API_KEY`.
- Service-to-service HTTP phai co timeout, retry, circuit breaker va correlation id.
- Domain event quan trong phai di qua RabbitMQ va outbox pattern neu co thay doi DB kem theo.

## 3. Database Va Domain Ownership

Huong so huu du lieu:

- Auth DB: `users`, role, password hash, refresh token/version, profile.
- Catalog DB: `companies`, `events`, `tickets`, `seatlocks`, inventory.
- Booking DB: `bookings`, `payments`, `eventoutboxes`, purchase/rate limit counters neu dung Mongo store.
- Check-in DB: `checkin_booking_projections`, `checkinlogs`, `checkindevices`.
- Notification DB/domain: email jobs, email logs, templates, campaign/reminder.

Quy tac snapshot/projection:

- Booking phai luu snapshot ticket/event tai thoi diem mua.
- Check-in service dung `CheckInBookingProjection`, khong dung truc tiep `Booking` schema.
- Khi booking/payment/pass thay doi, event phai cap nhat projection can thiet.
- Neu them field moi vao booking/catalog, chi dua vao projection neu check-in that su can.

## 4. Tieu Chi Chong Oversell

Queue mua ve da duoc tat theo dinh huong hien tai: khach vao mua truc tiep, khong day vao hang cho xu ly booking noi bo.

Viec khong oversell khong duoc dua vao queue. Bat buoc dua vao atomic inventory.

Tieu chi bat buoc:

- Reserve ve bang atomic update trong catalog-service.
- Dieu kien update phai kiem tra `availableSeats >= quantity`.
- Tru ve va tang reserved/sold phai nam trong cung mot lenh update hoac transaction phu hop.
- Booking moi tao phai o trang thai pending va co `expiresAt`.
- Booking qua han chua thanh toan phai bi expiration worker huy va release inventory.
- Payment complete phai idempotent va atomic.
- Webhook payment goi lai nhieu lan chi duoc confirm booking mot lan.
- Frontend/mobile chi hien thi ton kho tham khao; backend moi la noi quyet dinh ton kho that.

Khong duoc:

- Doc available seats roi ghi lai bang logic thuong.
- Tin vao so luong ve tu frontend.
- Confirm booking khi payment pending, expired hoac da cancelled.
- Check-in pass khong o trang thai `issued`.

## 5. Chien Luoc Tai Cao Va Hot Sale

Vi booking queue da tat, he thong phai dung cac lop bao ve khac:

- Cloudflare DDoS/WAF/rate limiting.
- Cloudflare Turnstile hoac bot challenge cho checkout/hot sale.
- Bot risk score va device fingerprint.
- Rate limit o API theo user/IP/device.
- Purchase limit theo user + event + payment method + device.
- Atomic inventory reserve trong DB.
- HPA tren Kubernetes cho service can scale.
- Spot instance cho app node pool de toi uu chi phi khi scale up.
- Observability de thay loi booking/payment/inventory som.

Neu co dot concert cuc lon:

- Co the bat Cloudflare Waiting Room o tang edge.
- Co the giam `BOOKING_HOLD_MINUTES` de ve pending quay lai kho nhanh hon.
- Co the tang replica booking/catalog va DB capacity.
- Co the chay load test truoc gio mo ban.

## 6. Bao Mat

Nguyen tac bao mat:

- Mat khau phai hash bang bcrypt voi rounds du manh.
- Neu co pepper, pepper phai lay tu secret manager/env, khong hardcode.
- JWT secret, internal API key, payment secret, email secret va hash key khong duoc commit.
- QR/NFC/pass scan token khong nen luu plain text neu khong bat buoc.
- Scan token, NFC payload va input check-in nen hash/HMAC truoc khi luu/log.
- Check-in log khong luu raw token nhay cam.
- API noi bo phai co `x-internal-api-key`.
- ServiceAccount Kubernetes rieng cho tung service, mac dinh `automountServiceAccountToken: false`.
- Secret production/staging nen di qua AWS Secrets Manager/External Secrets.

Can uu tien tiep:

- mTLS giua service-to-service bang service mesh nhu Istio/Linkerd khi tien gan production nghiem tuc.
- Egress NetworkPolicy de service chi goi dung DB/broker/service/provider can thiet.
- Session/refresh token rotation va revoke ro rang hon neu can bao mat cao.

## 7. Frontend Web

Dinh huong frontend:

- Giao dien hien tai dung tieng Anh.
- Khong de UI goi truc tiep service noi bo; tat ca public API di qua gateway.
- API response phai duoc unwrap dung contract backend.
- Trang booking/dashboard khong duoc mac dinh `data` la array neu backend tra `{ bookings, pagination }`.
- Checkout phai hien thi trang thai ro rang: pending, redirect payment, payment success/fail.
- Bot protection token/device fingerprint phai duoc gui trong checkout khi tinh nang bat.
- Khong de frontend quyet dinh ton kho cuoi cung.

Tieu chi UX:

- Trang su kien va checkout phai nhanh, nhe, it blocking.
- Loi API phai hien thi than thien, khong lo stack trace.
- Admin dashboard phai phan biet data public, internal va admin.

## 8. Mobile App

Mobile la app rieng, dung chung backend voi web.

Tinh nang chinh:

- Dang nhap/dang ky.
- Xem su kien/ve.
- Gio hang va checkout.
- Xem booking va mobile pass.
- Hien thi QR/barcode/NFC payload.
- Staff/admin check-in bang camera, barcode, NFC hoac manual.

Dinh huong hien tai:

- Local/dev payment provider mac dinh la `mock`.
- Neu `EXPO_PUBLIC_PAYMENT_PROVIDER=mock`, booking dung payment method demo hop le nhu `credit_card`, sau do goi mock payment process.
- Khi dung that, set `EXPO_PUBLIC_PAYMENT_PROVIDER=vnpay` hoac `momo`.
- Expo Go khong du cho NFC native/HCE; can development build hoac APK/AAB.
- Mobile khong duoc tu validate ve la hop le; phai goi backend check-in API.

## 9. Payment

Huong payment:

- Payment that di qua `POST /api/payment/session` va gateway redirect/deeplink.
- Webhook VNPay/MoMo phai xac thuc signature/HMAC.
- Mock payment chi dung local/dev.
- Payment complete phai idempotent.
- Payment record phai co provider, amount, currency, transaction id, provider reference va status.
- Khong confirm booking neu amount/provider/order khong khop.

## 10. Event, Outbox Va Messaging

RabbitMQ la event broker cho domain events.

Event quan trong:

- `booking.created`
- `booking.cancelled`
- `booking.expired`
- `payment.completed`
- `pass.checked_in`
- `user.registered`
- `password.reset_requested`
- `event.reminder_due`

Tieu chi:

- Event publish quan trong nen ghi vao outbox cung transaction voi thay doi domain.
- Outbox worker retry khi broker loi.
- Consumer phai co retry/DLQ va idempotency key.
- Projection service phai xu ly duplicate event an toan.
- Event contract nen duoc ghi trong OpenAPI/internal docs hoac file contract rieng.

## 11. Infra Va Deployment

Repo infra rieng nam o `D:\ticket\ticket-infra`.

Dinh huong ha tang:

- AWS la cloud target hien tai.
- Cloudflare la lop bao ve public dau tien.
- Frontend static nen dung S3 + CloudFront.
- Backend microservices chay tren EKS.
- Public API vao cluster qua AWS Load Balancer Controller + ALB Ingress.
- Service Kubernetes dung `ClusterIP`, khong expose service backend truc tiep.
- NetworkPolicy co default-deny ingress va allow theo luong can thiet.
- Terraform chia layer:
  - `00-networking`
  - `01-kubernetes`
  - `02-data`
  - `03-storage`
  - `04-observability`
- Argo CD dung GitOps cho deploy Kubernetes.
- Dev sync tu branch `dev`; prod sync tu branch `main` va nen manual.

HPA/HA:

- Service quan trong can co replicas >= 2 o staging/prod.
- Can PDB cho service quan trong.
- Can topology spread/anti-affinity de tranh cung node/AZ.
- HPA dua tren CPU/memory/custom metrics neu co.
- App node pool co the dung Spot de toi uu chi phi, nhung system/critical components nen on-demand.

## 12. Networking

Luong public:

```text
User/Web/Mobile
  -> Cloudflare
  -> AWS ALB Ingress
  -> Kubernetes Service api-gateway:5000
  -> api-gateway proxy den service noi bo
```

Luong service-to-service:

- `api-gateway` goi auth/catalog/booking/checkin/notification.
- `booking-service` goi `catalog-service` de reserve/release inventory.
- `auth-service` co the goi catalog/booking/checkin cho admin aggregate.
- Event-driven updates di qua RabbitMQ.

NetworkPolicy hien tai:

- Co default-deny ingress cho app pods.
- Mo ingress co chon loc theo service can goi.
- Can bo sung egress policy neu muon chat hon.

## 13. Observability Va Quality Gate

Can duy tri:

- `/health/live`
- `/health/ready`
- `/health/dependencies`
- Metrics Prometheus.
- OpenTelemetry tracing.
- Grafana dashboard theo service.
- Alert cho booking/payment/outbox/DB latency/pod restart/HPA max replica.

CI/CD nen co:

- Lint/typecheck/build.
- Unit/integration test.
- Dependency audit.
- Secret scan.
- SAST/SonarQube.
- OWASP Dependency Check.
- Trivy filesystem/image scan.
- Build image theo tung service.
- Tag image theo `deploy_env-short_sha`.
- Deploy doc lap theo service thay doi.

## 14. Quy Tac Code Va Refactor

Khi code tiep:

- Uu tien sua dung domain owner thay vi shortcut cross-service.
- Service moi phai co package/folder rieng, Dockerfile rieng, env rieng, health check rieng.
- Shared code that su dung chung moi dua vao `backend/packages/shared` hoac `backend/packages/platform`.
- Khong de shim legacy ton tai vo thoi han; neu can giu, phai co ly do ro.
- Serializer/mapper phai tach public format voi internal/admin format.
- API contract thay doi phai cap nhat web, mobile, OpenAPI va test.
- Test nen khoa cac contract quan trong: booking list, check-in projection, inventory reserve, payment webhook.
- Khong commit `.env`, secret, token, local cache, build artifact.

## 15. Cac Dieu Khong Nen Lam

- Khong dua tat ca service ve monolith.
- Khong dung chung mot DB cho moi service neu dang theo microservices.
- Khong expose auth/catalog/booking/checkin service truc tiep ra Internet.
- Khong luu payment secret, NFC token, scan token plain text neu khong bat buoc.
- Khong xoa user changes trong git working tree neu khong duoc yeu cau.
- Khong bo atomic inventory update de thay bang logic frontend hoac queue.
- Khong dung `latest` image tag cho deployment quan trong.
- Khong deploy prod tu branch dev.

## 16. Trang Thai Uu Tien Hien Tai

Uu tien cao:

- Bao dam khong oversell khi queue da tat.
- Hoan thien egress NetworkPolicy.
- Tiep tuc tach service package/doc lap neu can build context hep hon.
- Bo sung integration test cho inventory/payment/check-in projection.
- Chuan hoa README/tai lieu bi lech encoding neu can.
- Kiem tra lai payment provider thuc te truoc khi demo production.

Uu tien trung binh:

- Hoan thien dashboard Grafana theo tung service.
- Bo sung alert HPA max replica, payment webhook fail, outbox pending lau.
- Chuan hoa OpenAPI contract cho public va internal API.
- Xem xet service mesh/mTLS khi tien gan staging/prod that.

Uu tien thap:

- Don file generated cua tool neu khong dung.
- Lam sach log local va artifact dev.
- Toi uu UI/animation sau khi business flow on dinh.

## 17. Definition Of Done

Mot thay doi duoc xem la xong khi:

- Dung muc tieu san pham va khong pha kien truc microservices.
- Khong tao cross-service DB coupling moi.
- Khong lam lo secret hoac token nhay cam.
- Khong lam tang rui ro oversell.
- Backend test/build lien quan pass.
- Frontend/mobile build hoac smoke test lien quan pass neu co thay doi UI.
- Gortex/review/tooling khong bao finding nghiem trong.
- Tai lieu/env/infra duoc cap nhat neu behavior deploy thay doi.

