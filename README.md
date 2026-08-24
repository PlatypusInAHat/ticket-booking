# Nền Tảng Đặt Vé

Hệ thống đặt vé theo mô hình microservices, hỗ trợ web, mobile, check-in bằng QR/barcode/NFC, thanh toán qua gateway và backend hướng sự kiện.

Tài liệu này là file mô tả chính của dự án. Nội dung phản ánh trạng thái hiện tại của codebase sau các đợt refactor backend, tách package dùng chung và bổ sung projection riêng cho check-in service.

## 1. Tổng quan

Hệ thống hỗ trợ 4 nhóm chức năng chính:

- Khách hàng xem sự kiện, chọn vé, tạo booking, thanh toán, nhận vé điện tử.
- Nhân viên check-in quét QR, barcode, NFC hoặc nhập tay mã vé.
- Admin và organizer quản lý công ty, sự kiện, loại vé, booking, thanh toán, dashboard.
- Mobile app dùng chung backend với web, bao gồm cả luồng mua vé và luồng check-in.

Backend đã được chuyển sang kiến trúc microservices với:

- Mỗi service có phạm vi nghiệp vụ riêng.
- Mỗi service có database riêng.
- Service-to-service call qua internal API.
- Domain events đi qua RabbitMQ.
- Event publish được bảo vệ bằng outbox pattern.
- Check-in service dùng projection model riêng, không còn phụ thuộc trực tiếp vào booking schema.

## 2. Công nghệ

### Backend

- Node.js
- Express
- MongoDB + Mongoose
- RabbitMQ
- JWT
- bcrypt
- OpenTelemetry
- Docker Compose

### Frontend Web

- React
- Redux Toolkit
- React Router
- Tailwind CSS

### Mobile

- Expo / React Native
- NFC support cho Android build native
- QR / barcode / deep link payment flow

### Infra / Ops

- Docker Compose cho local
- EKS / Kubernetes / HPA / PDB / observability ở repo infra riêng
- CI/CD và image tagging đã được tách theo service

## 3. Cấu trúc dự án

```text
ticket-booking-app/
  backend/
    microservices/
      api-gateway/
      auth-service/
      catalog-service/
      booking-service/
      checkin-service/
      notification-service/
    packages/
      platform/
      shared/
    services/
      auth/
      booking/
      catalog/
      checkin/
      notification/
    shared/
    middleware/
    scripts/
    __tests__/
  frontend/
  mobile/
  docker-compose.yml
  README.md
```

## 4. Kiến trúc backend

### 4.1 Danh sách service

| Service | Port | DB | Vai trò |
| --- | ---: | --- | --- |
| `api-gateway` | `5000` | không có | public entrypoint cho web/mobile |
| `auth-service` | `5101` | `ticket-auth` | auth, user, admin |
| `catalog-service` | `5102` | `ticket-catalog` | company, event, ticket, inventory |
| `booking-service` | `5103` | `ticket-booking` | booking, pass, payment, queue, outbox |
| `checkin-service` | `5104` | `ticket-checkin` | validate/check-in, device, log, projection |
| `notification-service` | `5105` | notification domain | email queue, reminder, campaign |

### 4.2 Nguyên tắc tách service

- Không query database của service khác.
- Không import model nghiệp vụ của service khác để xử lý runtime.
- Dùng snapshot hoặc projection khi cần dữ liệu từ domain khác.
- Internal API được bảo vệ bằng `INTERNAL_API_KEY`.
- Event broker được dùng cho thay đổi domain quan trọng.

### 4.3 Giao tiếp giữa các service

Có 2 kiểu:

- Đồng bộ: HTTP internal call qua gateway helper / internal client.
- Bất đồng bộ: RabbitMQ domain event.

Ví dụ:

- `booking-service` gọi `catalog-service` để reserve / release inventory.
- `auth-service` gọi internal APIs khi cần thông tin quản trị.
- `booking.created`, `payment.completed`, `booking.cancelled`, `pass.checked_in` được phát qua broker.

## 5. Event-driven và outbox

### 5.1 Domain events chính

- `booking.created`
- `booking.cancelled`
- `booking.expired`
- `payment.completed`
- `pass.checked_in`
- `user.registered`
- `password.reset_requested`
- `event.reminder_due`

### 5.2 Outbox pattern

Booking và các service phát event quan trọng không publish trực tiếp là đủ.

Luồng:

1. Ghi thay đổi domain và event vào MongoDB transaction.
2. Event được đưa vào `EventOutbox`.
3. Outbox publisher worker đọc batch pending.
4. Publisher đẩy event sang RabbitMQ.
5. Nếu broker lỗi, event vẫn còn trong outbox và sẽ retry.

Mục tiêu:

- Không mất event nếu service crash sau khi commit DB.
- Tách luồng write domain với luồng publish broker.

## 6. Database theo service

### 6.1 Auth DB

Collection chính:

- `users`

Nội dung:

- thông tin user
- role: `user`, `admin`, `staff`, `organizer`
- password hash, password pepper metadata
- refresh token version
- profile, preferences, verification state

### 6.2 Catalog DB

Collection chính:

- `companies`
- `events`
- `tickets`
- `seatlocks`

Quan hệ:

- Mỗi `event` thuộc một `company`
- Mỗi `ticket` thuộc một `event`
- Inventory và seat lock nằm ở catalog domain

### 6.3 Booking DB

Collection chính:

- `bookings`
- `payments`
- `eventoutboxes`
- rate limit / purchase limit counters nếu bật store bằng Mongo

Booking lưu:

- danh sách ticket đã mua
- snapshot thông tin event/ticket tại thời điểm đặt
- passes
- pricing
- payment status
- booking status
- source: `web`, `mobile`, `admin`, `api`

### 6.4 Check-in DB

Collection chính:

- `checkin_booking_projections`
- `checkinlogs`
- `checkindevices`

Quan trọng:

- Check-in service không còn dùng `Booking` schema của booking-service.
- Nó dùng `CheckInBookingProjection` riêng chỉ gồm dữ liệu phục vụ quét vé.
- Projection được cập nhật từ domain events.

### 6.5 Notification

Hiện tại notification service tập trung vào:

- email queue
- email log / template / preference
- reminder flow

Nếu mở rộng, có thể tách DB notification riêng rõ hơn theo môi trường.

## 7. Check-in projection model

Đây là thay đổi quan trọng của kiến trúc hiện tại.

### 7.1 Vấn đề cũ

Trước đây, checkin-service dùng trực tiếp model `Booking` của booking-service để:

- lưu projection local
- validate pass
- check-in atomic

Cách này chạy được nhưng coupling rất chặt:

- booking schema đổi thì checkin projection đổi theo ngầm
- checkin DB trở thành bản sao booking domain
- khó kiểm soát contract read model

### 7.2 Cách hiện tại

Check-in service đã dùng model riêng:

- [backend/services/checkin/src/models/CheckInBookingProjection.js](backend/services/checkin/src/models/CheckInBookingProjection.js)

Projection chỉ lưu:

- `bookingNumber`
- `user`
- `bookingStatus`
- `paymentStatus`
- `customerInfo`
- `passes`
- `ticketSnapshot` trong từng pass
- `sourceUpdatedAt`
- `projectedAt`

### 7.3 Event mapping

Subscriber:

- [backend/subscribers/checkinSubscribers.js](backend/subscribers/checkinSubscribers.js)

Hàm mapping chính:

- `toTicketSnapshotMap`
- `toProjectionPass`
- `toCheckInBookingProjection`

Projection được cập nhật khi nhận:

- `booking.created`
- `payment.completed`
- `booking.cancelled`
- `booking.expired`

### 7.4 Test contract

Đã có test riêng:

- [backend/__tests__/checkinProjection.test.js](backend/__tests__/checkinProjection.test.js)

Mục tiêu:

- khóa contract mapping event payload -> check-in projection
- giảm regressions khi booking domain thay đổi

## 8. Mua vé, oversell, queue, rate limit

### 8.1 Luồng mua vé

1. User chọn ticket.
2. `booking-service` gọi `catalog-service` reserve inventory.
3. Booking được tạo ở trạng thái `pending`.
4. Pass được generate trong booking domain.
5. User tạo payment session.
6. Webhook / payment callback xác nhận thanh toán.
7. Booking được chuyển sang `confirmed`.
8. Event `payment.completed` được phát.

### 8.2 Chống oversell

Có các lớp:

- reserve inventory bằng update có điều kiện
- booking hold time
- expiration worker
- release inventory khi booking hết hạn / hủy
- payment completion atomic

### 8.3 Queue và spam control

Backend đã có:

- rate limit
- purchase queue
- purchase limit grouping theo event

Lưu ý:

- Nếu rate limit / queue đang chạy theo in-memory thì khi scale nhiều pod cần đổi sang shared store để thành quota toàn hệ thống.
- Nếu đã bật Mongo store cho limiter thì sẽ ổn hơn cho multi-replica.

## 9. Payment flow

Hỗ trợ:

- mock payment cho dev
- VNPay
- MoMo

Service:

- [backend/services/booking/src/services/paymentService.js](backend/services/booking/src/services/paymentService.js)

Public API:

- `POST /api/payment/session`
- `POST /api/payment/process`
- `GET /api/payment/:bookingId`
- `POST /api/payment/webhooks/momo`
- `GET /api/payment/webhooks/vnpay`
- `GET /api/payment/return/vnpay`

Khuyến nghị:

- Mobile và web nên dùng `createSession` + redirect / deeplink payment thật
- Không gọi thẳng mock `/payment/process` trong luồng payment thật

## 10. Vé điện tử: QR, barcode, NFC

Mỗi pass có:

- `passCode`
- `barcodeValue`
- `scanTokenHash`
- `nfcPayloadHash`
- `status`
- `checkInMethod`
- `checkedInAt`
- `checkInGate`
- `checkInDevice`

Bảo mật:

- Không lưu hay expose secret scan token plain text một cách tùy tiện
- Dùng hash/HMAC cho payload nhạy cảm
- Check-in log lưu hash của input scan, không lưu plain token

## 11. Mobile app

Thư mục:

- `mobile/`

Chức năng:

- đăng nhập
- xem ticket
- thêm vào giỏ
- checkout
- xem booking / passes
- check-in cho staff/admin
- NFC support trên Android native build

Lưu ý:

- Expo Go không đủ cho luồng NFC HCE native
- Cần development build hoặc APK/AAB thật
- Mobile phải trỏ đúng `API_BASE_URL`

## 12. Chạy local

### 12.1 Docker Compose

```bash
docker compose up --build
docker compose run --rm seed-microservices
```

### 12.2 Backend local

```bash
cd backend
npm install
npm start
```

### 12.3 Frontend

```bash
cd frontend
npm install
npm start
```

### 12.4 Mobile

```bash
cd mobile
npm install
npm start
```

## 13. Biến môi trường quan trọng

### Core

```env
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
PUBLIC_API_URL=http://localhost:5000
INTERNAL_API_KEY=change_me
JWT_SECRET=change_me
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_EXPIRE=24h
SECRET_HASH_KEY=change_me
PASSWORD_HASH_ROUNDS=12
PASSWORD_PEPPER=change_me
MIN_PASSWORD_LENGTH=8
```

### Broker / outbox

```env
EVENT_BROKER_URL=amqp://localhost:5672
EVENT_EXCHANGE=ticket-booking.events
OUTBOX_ENABLED=true
OUTBOX_PUBLISH_INTERVAL_MS=5000
OUTBOX_BATCH_SIZE=50
```

### Booking / queue / rate limit

```env
BOOKING_HOLD_MINUTES=15
BOOKING_EXPIRATION_INTERVAL_MS=30000
BOOKING_EXPIRATION_BATCH_SIZE=50
BOOKING_QUEUE_ENABLED=false
BOOKING_QUEUE_CONCURRENCY=5
BOOKING_QUEUE_MAX_SIZE=500
BOOKING_QUEUE_WAIT_TIMEOUT_MS=30000
RATE_LIMIT_ENABLED=true
BOOKING_CREATE_RATE_LIMIT_WINDOW_MS=60000
BOOKING_CREATE_RATE_LIMIT_MAX=8
```

### Payment

```env
VNPAY_TMN_CODE=change_me
VNPAY_HASH_SECRET=change_me
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
MOMO_PARTNER_CODE=change_me
MOMO_ACCESS_KEY=change_me
MOMO_SECRET_KEY=change_me
```

### Databases

```env
AUTH_MONGODB_URI=mongodb://localhost:27018/ticket-auth
CATALOG_MONGODB_URI=mongodb://localhost:27019/ticket-catalog
BOOKING_MONGODB_URI=mongodb://localhost:27020/ticket-booking
CHECKIN_MONGODB_URI=mongodb://localhost:27021/ticket-checkin
```

## 14. API public chính

Tất cả đi qua gateway với prefix `/api`.

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh-token`

### User

- `GET /api/users/profile`
- `PUT /api/users/profile`

### Catalog

- `GET /api/companies`
- `GET /api/events`
- `GET /api/tickets`
- `GET /api/tickets/:id`

### Booking

- `POST /api/bookings`
- `GET /api/bookings`
- `GET /api/bookings/:id`
- `PUT /api/bookings/:id/cancel`
- `GET /api/bookings/:id/passes`
- `GET /api/bookings/:id/passes/:passId`
- `GET /api/bookings/:id/passes/:passId/qr.png`
- `GET /api/bookings/:id/passes/:passId/barcode.png`
- `GET /api/bookings/:id/passes/:passId/nfc-payload`

### Payment

- `POST /api/payment/session`
- `POST /api/payment/process`
- `GET /api/payment/:bookingId`

### Check-in

- `POST /api/checkin/validate`
- `POST /api/checkin`
- `GET /api/checkin/stats`

## 15. Test và quality gate

Backend test:

```bash
cd backend
npm test -- --runInBand
```

Test hiện có:

- [backend/__tests__/backendLogic.test.js](backend/__tests__/backendLogic.test.js)
- [backend/__tests__/checkinProjection.test.js](backend/__tests__/checkinProjection.test.js)

Nên mở rộng thêm:

- payment webhook integration test
- inventory reservation concurrency test
- rate limit / queue shared-store test
- notification idempotency test

## 16. Tài khoản demo

Sau khi seed:

- Admin: `admin@ticketbooking.com` / `admin12345`
- User: `user@ticketbooking.com` / `user12345`
- Staff: `staff@ticketbooking.com` / `staff12345`

## 17. Troubleshooting

### MongoDB không kết nối

- Kiểm tra URI từng service
- Kiểm tra port local / container mapping
- Kiểm tra replica set nếu muốn dùng transaction thật sự

### RabbitMQ lỗi

- Kiểm tra `EVENT_BROKER_URL`
- Kiểm tra exchange / queue trong management UI
- Kiểm tra worker outbox có đang chạy không

### Mobile không gọi được API

- Không dùng `localhost` trên điện thoại thật
- Dùng IP LAN của máy backend

### NFC không hoạt động

- Expo Go không đủ
- Cần Android native build
- Kiểm tra thiết bị có NFC và đã bật NFC

### Thanh toán không redirect

- Kiểm tra env của VNPay / MoMo
- Kiểm tra `PUBLIC_API_URL`
- Kiểm tra frontend/mobile đang dùng `createSession`

## 18. Trạng thái hiện tại của codebase

Đã hoàn thành:

- microservices backend tách rõ service packages
- package `@ticket-booking/shared`
- package `@ticket-booking/platform`
- outbox pattern
- event consumer retry / DLQ logic
- check-in projection model riêng
- test contract cho projection mapping

Còn nên tiếp tục:

- bổ sung integration test cho payment và event flow
- review shared-store cho rate limit / queue khi scale nhiều replica
- tiếp tục đồng bộ document infra nếu repo infra thay đổi

## 19. Ghi chú maintainers

- Khi thêm field mới cho booking domain, chỉ thêm vào check-in projection nếu check-in cần dùng đến.
- Không import model của service khác để xử lý nghiệp vụ runtime.
- Ưu tiên serializer / mapper / projection rõ ràng thay vì trả document Mongoose sống.
- Khi thêm event mới, cập nhật:
- publisher
- subscriber
- outbox behavior nếu cần
- test contract nếu event ảnh hưởng projection
