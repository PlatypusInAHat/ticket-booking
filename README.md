# Ticket Booking App

Đây là hệ thống đặt vé gồm web, backend microservices và app mobile. Tài liệu này là file Markdown chính của project, đã gom nội dung từ các file README/setup/schema/security/microservices cũ về một nơi để dễ đọc và dễ bảo trì.

## 1. Tổng Quan

Ứng dụng hỗ trợ:

- Khách hàng xem sự kiện, mua vé, xem vé điện tử, QR, barcode và NFC payload.
- Nhân viên check-in quét QR, barcode, NFC hoặc nhập thủ công.
- Admin/organizer quản lý công ty, sự kiện, loại vé, đơn đặt vé, thanh toán và thống kê.
- Mobile app dùng chung backend với web, có luồng khách hàng và luồng nhân viên check-in.
- Backend đã chuyển sang mô hình microservices, mỗi service có database riêng và giao tiếp qua API nội bộ + RabbitMQ event broker.

## 2. Công Nghệ

- Backend: Node.js, Express, MongoDB, Mongoose, JWT, bcrypt, Stripe-ready, RabbitMQ.
- Frontend web: React 18, Redux Toolkit, React Router, Axios, Tailwind CSS.
- Mobile: Expo, React Native, expo-camera, react-native-nfc-manager, Android HCE native.
- Hạ tầng local: Docker Compose, RabbitMQ Management UI, 4 MongoDB riêng cho service.

## 3. Cấu Trúc Chính

```text
ticket-booking-app/
  backend/
    microservices/
      api-gateway/
      auth-service/
      catalog-service/
      booking-service/
      checkin-service/
    controllers/
    middleware/
    models/
    routes/
      internal/
    scripts/
    serializers/
    services/
    shared/
    utils/
  frontend/
    src/
  mobile/
    android/
    scripts/
    src/
  docker-compose.yml
  README.md
```

## 4. Kiến Trúc Microservices

Backend hiện chạy theo hướng microservice-only. File `backend/server.js` chỉ đóng vai trò entrypoint để chạy `scripts/startMicroservices.js`.

| Service | Port | Database | Vai trò |
| --- | ---: | --- | --- |
| `api-gateway` | `5000` | Không sở hữu DB | Public API cho web/mobile, proxy request sang service nội bộ |
| `auth-service` | `5101` | `ticket-auth` | Người dùng, đăng ký, đăng nhập, JWT, profile |
| `catalog-service` | `5102` | `ticket-catalog` | Công ty, sự kiện, vé, tồn kho vé |
| `booking-service` | `5103` | `ticket-booking` | Booking, pass/vé điện tử, thanh toán, seat lock |
| `checkin-service` | `5104` | `ticket-checkin` | Thiết bị check-in, validate/check-in log, thống kê cổng vào |
| `rabbitmq` | `5672`, UI `15672` | Volume riêng | Event broker |

Nguyên tắc tách service:

- Không service nào được query trực tiếp database của service khác.
- Không dùng cross-service `populate`.
- Không import model thuộc service khác để xử lý nghiệp vụ.
- Dữ liệu cần hiển thị lâu dài phải được lưu bằng snapshot/projection.
- Thay đổi nghiệp vụ quan trọng nên phát domain event qua RabbitMQ.
- API nội bộ phải dùng `INTERNAL_API_KEY`.

Các event chính:

- `ticket.reserved`
- `ticket.reservation_failed`
- `ticket.released`
- `booking.created`
- `booking.cancelled`
- `payment.completed`
- `payment.failed`
- `pass.checked_in`
- `event.revenue_updated`

## 5. Chạy Nhanh Bằng Docker Compose

Yêu cầu: Docker Desktop, Node.js nếu muốn chạy frontend/mobile bên ngoài container.

```bash
docker compose up --build
```

Sau khi các service đã chạy, seed dữ liệu mẫu:

```bash
docker compose run --rm seed-microservices
```

Các địa chỉ local:

- API Gateway: `http://localhost:5000`
- Auth service: `http://localhost:5101`
- Catalog service: `http://localhost:5102`
- Booking service: `http://localhost:5103`
- Check-in service: `http://localhost:5104`
- RabbitMQ UI: `http://localhost:15672`
- RabbitMQ mặc định: `guest` / `guest`
- Mongo auth: `mongodb://localhost:27018/ticket-auth`
- Mongo catalog: `mongodb://localhost:27019/ticket-catalog`
- Mongo booking: `mongodb://localhost:27020/ticket-booking`
- Mongo check-in: `mongodb://localhost:27021/ticket-checkin`

## 6. Chạy Local Không Dùng Docker

Backend cần MongoDB và RabbitMQ đang chạy sẵn.

```bash
cd backend
npm install
copy .env.example .env
npm run seed
npm start
```

Chạy từng service nếu cần debug riêng:

```bash
npm run start:gateway
npm run start:auth-service
npm run start:catalog-service
npm run start:booking-service
npm run start:checkin-service
```

Frontend web:

```bash
cd frontend
npm install
npm start
```

Frontend mở tại `http://localhost:3000` và proxy API sang `http://localhost:5000`.

Mobile:

```bash
cd mobile
npm install
npm start
```

Nếu chạy trên điện thoại thật, cấu hình API bằng IP LAN của máy đang chạy backend:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.10:5000/api
```

## 7. Tài Khoản Demo

Sau khi chạy seed:

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Admin | `admin@ticketbooking.com` | `admin12345` |
| Khách hàng | `user@ticketbooking.com` | `user12345` |
| Nhân viên check-in | `staff@ticketbooking.com` | `staff12345` |

## 8. Biến Môi Trường Quan Trọng

Các biến nên đổi khi chạy ngoài môi trường demo:

```env
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
JWT_SECRET=change_me
JWT_EXPIRE=7d
INTERNAL_API_KEY=change_me
SECRET_HASH_KEY=change_me
PASSWORD_HASH_ROUNDS=12
PASSWORD_PEPPER=change_me
MIN_PASSWORD_LENGTH=8
EVENT_BROKER_URL=amqp://localhost:5672
EVENT_EXCHANGE=ticket-booking.events
OUTBOX_ENABLED=true
OUTBOX_PUBLISH_INTERVAL_MS=5000
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_PUBLIC_KEY=pk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
VNPAY_TMN_CODE=change_me
VNPAY_HASH_SECRET=change_me
MOMO_PARTNER_CODE=change_me
MOMO_ACCESS_KEY=change_me
MOMO_SECRET_KEY=change_me
PUBLIC_API_URL=http://localhost:5000
```

URI database theo service:

```env
AUTH_MONGODB_URI=mongodb://localhost:27018/ticket-auth
CATALOG_MONGODB_URI=mongodb://localhost:27019/ticket-catalog
BOOKING_MONGODB_URI=mongodb://localhost:27020/ticket-booking
CHECKIN_MONGODB_URI=mongodb://localhost:27021/ticket-checkin
```

## 9. API Public

Tất cả API public đi qua gateway ở prefix `http://localhost:5000/api`.

### Auth

- `POST /api/auth/register`: đăng ký tài khoản.
- `POST /api/auth/login`: đăng nhập và nhận JWT.

### Users

- `GET /api/users/profile`: lấy hồ sơ người dùng hiện tại.
- `PUT /api/users/profile`: cập nhật hồ sơ.

### Companies

- `GET /api/companies`: danh sách công ty.
- `GET /api/companies/:id`: chi tiết công ty.
- `POST /api/companies`: tạo công ty, yêu cầu `admin` hoặc `organizer`.
- `PUT /api/companies/:id`: cập nhật công ty, yêu cầu `admin` hoặc `organizer`.

### Events

- `GET /api/events`: danh sách sự kiện.
- `GET /api/events/:id`: chi tiết sự kiện.
- `POST /api/events`: tạo sự kiện, yêu cầu `admin` hoặc `organizer`.
- `PUT /api/events/:id`: cập nhật sự kiện, yêu cầu `admin` hoặc `organizer`.

### Tickets

- `GET /api/tickets`: danh sách vé public, đã serialize theo format phía người dùng.
- `GET /api/tickets/:id`: chi tiết vé public.
- `POST /api/tickets`: tạo loại vé, yêu cầu `admin` hoặc `organizer`.
- `PUT /api/tickets/:id`: cập nhật loại vé, yêu cầu `admin` hoặc `organizer`.
- `DELETE /api/tickets/:id`: xóa/ẩn vé, yêu cầu `admin` hoặc `organizer`.

### Bookings Và Passes

- `POST /api/bookings`: tạo đơn đặt vé.
- `GET /api/bookings`: danh sách đơn của user hiện tại.
- `GET /api/bookings/:id`: chi tiết đơn.
- `POST /api/bookings/:id/cancel`: hủy đơn.
- `PUT /api/bookings/:id/cancel`: hủy đơn.
- `GET /api/bookings/:id/passes`: danh sách vé điện tử trong đơn.
- `GET /api/bookings/:id/passes/:passId`: chi tiết một pass.
- `GET /api/bookings/:id/passes/:passId/qr.png`: ảnh QR của pass.
- `GET /api/bookings/:id/passes/:passId/barcode.png`: ảnh barcode của pass.
- `GET /api/bookings/:id/passes/:passId/nfc-payload`: payload NFC của pass.

### Payments

- `POST /api/payment/session`: tạo phiên thanh toán thật cho `stripe`, `vnpay` hoặc `momo`.
- `POST /api/payment/process`: xử lý thanh toán mock/dev bằng `paymentToken`.
- `GET /api/payment/:bookingId`: lấy trạng thái thanh toán theo booking.
- `POST /api/payment/webhooks/stripe`: Stripe webhook, cần `STRIPE_WEBHOOK_SECRET`.
- `POST /api/payment/webhooks/momo`: MoMo IPN webhook, xác thực bằng HMAC.
- `GET /api/payment/webhooks/vnpay`: VNPay IPN webhook, xác thực `vnp_SecureHash`.
- `GET /api/payment/return/vnpay`: URL người dùng quay về sau khi thanh toán VNPay.

Với VNPay, cấu hình IPN URL trong merchant portal/sandbox trỏ về `VNPAY_IPN_URL` nếu tài khoản không hỗ trợ truyền IPN URL ngay trong request tạo payment URL.

### Check-in

- `POST /api/checkin/validate`: kiểm tra vé trước khi cho vào cổng.
- `POST /api/checkin`: check-in vé.
- `GET /api/checkin/stats`: thống kê check-in.

### Admin

- `GET /api/admin/stats`: thống kê dashboard.
- `GET /api/admin/bookings`: danh sách toàn bộ booking.
- `PUT /api/admin/bookings/:id/payment`: cập nhật trạng thái thanh toán.

## 10. Chống Oversell Khi Nhiều Người Cùng Mua

Luồng mua vé được thiết kế theo kiểu giữ vé có thời hạn:

- Khi khách bấm đặt vé, booking service gọi catalog service để reserve tồn kho.
- Catalog service dùng `findOneAndUpdate` với điều kiện `availableSeats >= quantity` và `$inc` trong cùng một lệnh MongoDB, nên nhiều request đồng thời vẫn không thể trừ quá số vé còn lại.
- Booking mới ở trạng thái `pending/pending` và có `expiresAt`.
- `BOOKING_HOLD_MINUTES` cấu hình thời gian giữ vé, mặc định 15 phút.
- Booking expiration worker chạy định kỳ theo `BOOKING_EXPIRATION_INTERVAL_MS`, mặc định 30 giây.
- Nếu quá hạn mà chưa thanh toán, booking được chuyển sang `cancelled/failed`, pass bị hủy và event `booking.expired` được phát để catalog service trả vé về kho.
- Payment service chỉ cho thanh toán booking còn `pending`, chưa hết hạn và chưa có payment completed. Việc chuyển sang `completed/confirmed` dùng update atomic để tránh double-payment.
- Check-in service cũng dùng update atomic: chỉ pass còn `issued` mới được đổi thành `checked_in`, tránh hai máy quét cùng lúc cùng thành công.
- API tạo booking có rate limit theo user/IP để chặn spam mua vé.
- Booking creation đi qua in-process queue có giới hạn concurrency và kích thước hàng đợi, giúp backend không bị dồn tải đột ngột khi mở bán concert.
- Domain event quan trọng được ghi vào outbox MongoDB trước, worker nền publish sang RabbitMQ và retry khi broker tạm lỗi.

Các biến môi trường liên quan:

```env
BOOKING_HOLD_MINUTES=15
BOOKING_EXPIRATION_INTERVAL_MS=30000
BOOKING_EXPIRATION_BATCH_SIZE=50
BOOKING_EXPIRATION_WORKER_ENABLED=true
BOOKING_QUEUE_ENABLED=true
BOOKING_QUEUE_CONCURRENCY=5
BOOKING_QUEUE_MAX_SIZE=500
BOOKING_QUEUE_WAIT_TIMEOUT_MS=30000
RATE_LIMIT_ENABLED=true
BOOKING_CREATE_RATE_LIMIT_WINDOW_MS=60000
BOOKING_CREATE_RATE_LIMIT_MAX=8
PAYMENT_RATE_LIMIT_WINDOW_MS=60000
PAYMENT_RATE_LIMIT_MAX=12
OUTBOX_ENABLED=true
OUTBOX_PUBLISH_INTERVAL_MS=5000
OUTBOX_BATCH_SIZE=50
```

Khi concert rất đông, có thể giảm `BOOKING_HOLD_MINUTES` xuống 5-10 phút và tăng `BOOKING_EXPIRATION_BATCH_SIZE` nếu lượng booking pending quá lớn.

## 11. Vé Điện Tử, QR, Barcode Và NFC

Mỗi booking có thể sinh nhiều `passes`. Mỗi pass là một vé điện tử riêng, có:

- `passCode`: mã vé hiển thị cho người dùng.
- `barcodeValue`: giá trị barcode.
- `scanTokenHash`: hash của token quét, dùng server-side để đối chiếu.
- `nfcPayloadHash`: hash của payload NFC.
- `holder`: thông tin người giữ vé.
- `seat`: ghế/khu vực nếu là reserved seating.
- `status`: `issued`, `checked_in`, `cancelled`, `voided`.
- `checkInMethod`: `qr`, `barcode`, `nfc`, `manual`.
- `checkedInAt`, `checkedInBy`, `checkInGate`, `checkInDevice`.

QR/barcode/NFC không nên lưu hoặc trả secret thô rộng rãi. Backend chỉ trả payload cần thiết cho chủ vé hợp lệ hoặc nhân viên có quyền. Dữ liệu nhạy cảm được hash bằng HMAC SHA-256 với `SECRET_HASH_KEY`.

Luồng check-in chuẩn:

1. Khách mở vé điện tử trên web/mobile.
2. Nhân viên quét QR/barcode hoặc đọc NFC.
3. App gọi `POST /api/checkin/validate` để kiểm tra.
4. Nếu hợp lệ, app gọi `POST /api/checkin`.
5. Booking service cập nhật pass thành `checked_in`.
6. Check-in service ghi `CheckInLog`.
7. Hệ thống phát event `pass.checked_in`.

## 12. Mobile App

Mobile app nằm ở thư mục `mobile/`, dùng chung API với web.

Chức năng chính:

- Khách hàng đăng nhập, xem sự kiện, mua vé, xem booking và vé điện tử.
- Nhân viên đăng nhập bằng role `staff`, quét QR/barcode để validate/check-in.
- Android hỗ trợ NFC qua native HCE service.
- iOS nên dùng QR/barcode làm phương án chính vì iPhone không mở HCE tự do như Android.

Chạy dev:

```bash
cd mobile
npm install
npm start
```

Build Android debug:

```bash
cd mobile
npm run android:build
```

APK debug:

```text
mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Các script Android:

- `npm run android`: build, cài vào thiết bị Android đang kết nối và mở app.
- `npm run android:install`: chỉ cài APK debug.
- `npm run android:gradle -- <task>`: chạy Gradle bằng môi trường JDK/SDK đã chuẩn hóa.
- `npm run android:expo`: chạy Expo CLI gốc nếu môi trường global đã đúng.

NFC Android:

- HCE native nằm tại `mobile/android/app/src/main/java/com/ticketbooking/mobile/nfc`.
- Expo Go không chạy được HCE native.
- Cần development build hoặc APK/AAB thật.
- Project có script dùng JDK 17 local để tránh lỗi `JAVA_HOME` đang trỏ JDK 17 nhưng `java -version` global vẫn là Java 8.

## 13. Database Theo Service

### Auth DB: `ticket-auth`

Collection chính: `users`.

`User` gồm:

- Thông tin cơ bản: `name`, `email`, `phone`, `avatar`, `address`.
- Phân quyền: `role` gồm `user`, `admin`, `staff`, `organizer`.
- Trạng thái: `status`, `emailVerified`, `phoneVerified`.
- Hồ sơ mở rộng: `profile.dateOfBirth`, `gender`, `identityNumber`, `companyName`, `taxCode`.
- Tùy chọn: `preferences.language`, `currency`, notification email/sms/push.
- Bảo mật: `password`, `security.passwordChangedAt`, `passwordHashAlgorithm`, `passwordHashRounds`, `passwordPeppered`, `failedLoginAttempts`, `lockedUntil`.
- Theo dõi: `lastLoginAt`, `createdAt`, `updatedAt`.

### Catalog DB: `ticket-catalog`

Collections chính: `companies`, `events`, `tickets`.

`Company` gồm:

- Danh tính: `name`, `legalName`, `slug`, `taxCode`, `logo`, `description`.
- Chủ sở hữu và thành viên: `owner`, `members.user`, `members.role`.
- Liên hệ: `contact.email`, `phone`, `website`, `address`.
- Trạng thái: `status`.
- Xác minh: `verification.status`, `verifiedAt`, `verifiedBy`, `documents`.
- Cài đặt: `settings.defaultCurrency`, `settings.payoutBank`.
- `metadata`, `createdAt`, `updatedAt`.

`Event` gồm:

- Quan hệ: `company`, `organizer`.
- Nội dung: `title`, `slug`, `eventType`, `description`, `coverImage`, `gallery`, `tags`.
- Địa điểm: `location.venue`, `address`, `city`, `state`, `country`, `coordinates`.
- Thời gian: `startsAt`, `endsAt`, `timezone`.
- Trạng thái: `status`.
- Bán vé: `saleWindow.startsAt`, `saleWindow.endsAt`.
- Check-in: `admission.gatesOpenAt`, `checkInStartsAt`, `checkInEndsAt`, `allowedMethods`.
- Chính sách: `refundPolicy`, `transferAllowed`, `ageRestriction`.
- Thống kê: `stats.totalTickets`, `soldTickets`, `revenue`, `views`.

`Ticket` là loại vé thuộc một sự kiện, gồm:

- Quan hệ: `event`, `company`, `organizer`.
- Nội dung public: `eventName`, `ticketName`, `slug`, `eventType`, `description`, `image`, `artist`, `duration`, `tags`.
- Địa điểm/thời gian: `location`, `date`, `time`, `timezone`.
- Giá và tồn kho: `price`, `currency`, `availableSeats`, `totalSeats`, `soldSeats`.
- Phân loại: `category`, `ticketType`.
- Trạng thái và hiển thị: `status`, `visibility`, `isActive`.
- Bán vé: `saleWindow`.
- Check-in: `admission.allowedMethods`.
- Ghế: `seatMap.mode`, `sections`, `rows`, `seats`.
- Chính sách: `refundPolicy`, `transferAllowed`, `maxTicketsPerUser`, `ageRestriction`.
- Thống kê: `stats.views`, `stats.favorites`.

API `/api/tickets` dùng serializer để chỉ trả format public cho phía người dùng, không lộ field nội bộ không cần thiết.

### Booking DB: `ticket-booking`

Collections chính: `bookings`, `payments`, `seatlocks`, `eventoutboxes`.

`Booking` gồm:

- Định danh: `bookingNumber`.
- Người mua: `user`, `customerInfo`.
- Dòng vé: `tickets[].ticket`, `quantity`, `pricePerUnit`, `subtotal`, `snapshot`.
- Vé điện tử: `passes[]`.
- Tiền: `totalAmount`, `currency`, `pricing.subtotal`, `discount`, `tax`, `serviceFee`, `grandTotal`, `promoCode`.
- Thanh toán: `paymentMethod`, `paymentStatus`, `transactionId`, `payments`.
- Trạng thái: `bookingStatus`, `statusHistory`, `confirmedAt`, `cancelledAt`, `expiresAt`.
- Nguồn: `source` gồm `web`, `mobile`, `admin`, `api`.
- Hoàn tiền: `refund.amount`, `reason`, `requestedAt`, `processedAt`, `processedBy`.
- Ghi chú và mở rộng: `notes`, `metadata`, `createdAt`, `updatedAt`.

`Booking.tickets[].snapshot` lưu lại dữ liệu vé tại thời điểm mua để tránh phụ thuộc catalog service khi hiển thị lịch sử đơn.

`Payment` gồm:

- Quan hệ: `booking`, `user`.
- Provider/method: `provider`, `method`.
- Tiền: `amount`, `currency`.
- Trạng thái: `status`, `processedAt`.
- Giao dịch: `transactionId`, `idempotencyKey`, `providerReference`, `providerOrderId`.
- Checkout: `checkoutUrl`, `clientSecret`, `expiresAt`.
- Secret: `paymentTokenHash`; `paymentToken` cũ là legacy và không nên dùng mới.
- Gateway data: `gatewayRequest`, `gatewayResponse` được `select: false`.
- Hoàn tiền: `refund`.

`EventOutbox` lưu domain event chưa publish hoặc cần retry:

- Định danh: `eventId`, `type`, `source`.
- Nội dung: `envelope`.
- Trạng thái: `status`, `attempts`, `nextAttemptAt`, `lockedAt`, `publishedAt`, `lastError`.

`SeatLock` gồm:

- `ticket`, `seatCode`, `user`, `booking`.
- `lockToken`, `status`, `expiresAt`.
- `releasedAt`, `convertedAt`, `metadata`.
- TTL index tự hết hạn lock đang ở trạng thái `locked`.

### Check-in DB: `ticket-checkin`

Collections chính: `checkindevices`, `checkinlogs`, `eventoutboxes`.

`CheckInDevice` gồm:

- `deviceId`, `name`, `type`, `status`.
- `gate`, `location`.
- `assignedStaff`.
- `capabilities.qr`, `barcode`, `nfc`, `manual`.
- `appVersion`, `lastSeenAt`, `lastUsedAt`, `registeredBy`, `notes`, `metadata`.

`CheckInLog` gồm:

- `action`: `validate` hoặc `check_in`.
- Quan hệ tham chiếu: `booking`, `passId`, `ticket`, `staff`.
- Cách quét: `method`, `gate`, `deviceId`.
- Bảo mật: `scanInputHash`, không lưu input thô.
- Kết quả: `result`, `reason`, `beforeStatus`, `afterStatus`.
- Request audit: `request.ip`, `request.userAgent`.
- `metadata`, `createdAt`, `updatedAt`.

## 14. Bảo Mật

Mật khẩu:

- User password được hash bằng bcrypt.
- Số vòng hash lấy từ `PASSWORD_HASH_ROUNDS`, mặc định `12`.
- Nếu có `PASSWORD_PEPPER`, mật khẩu được pepper trước khi bcrypt.
- Login vẫn hỗ trợ password hash legacy chưa pepper, sau đó đánh dấu cần rehash.
- Độ dài tối thiểu nên cấu hình bằng `MIN_PASSWORD_LENGTH`.

Secret/token:

- Pass scan token, NFC payload, payment token và input quét check-in được hash bằng HMAC SHA-256.
- Khóa HMAC lấy từ `SECRET_HASH_KEY`.
- Các field secret thô như `scanToken`, `nfcPayload`, `paymentToken` là legacy/ẩn `select: false`.
- API không nên trả secret thô trừ endpoint có quyền rõ ràng.

API nội bộ:

- Các route trong `backend/routes/internal` dùng `INTERNAL_API_KEY`.
- So sánh key bằng hàm an toàn thời gian để giảm rủi ro timing attack.

Lệnh migrate secret legacy:

```bash
cd backend
npm run security:migrate-secrets
```

Nên chạy lệnh này sau khi đổi `SECRET_HASH_KEY` hoặc sau khi import dữ liệu cũ có token thô chưa hash.

## 15. Scripts Backend

```bash
npm start                  # chạy toàn bộ microservices
npm run dev                # chạy toàn bộ microservices bằng nodemon
npm run seed               # seed dữ liệu microservices
npm run seed:microservices # alias seed
npm run backfill:events    # gắn/bổ sung event cho dữ liệu cũ
npm run backfill:passes    # bổ sung pass cho booking cũ
npm run security:migrate-secrets
npm test
```

## 16. Lưu Ý Phát Triển

- Khi thêm field mới cho public API, ưu tiên cập nhật serializer thay vì trả nguyên document Mongoose.
- Khi booking cần thông tin catalog, dùng snapshot hoặc gọi internal API; không query database catalog trực tiếp.
- Khi check-in cần xác thực pass, gửi token/payload tới API validate; không để app mobile tự quyết định vé hợp lệ.
- Khi thêm secret mới, lưu hash thay vì lưu plain text.
- Khi thêm service mới, tạo DB riêng, port riêng, health endpoint, internal API key và event contract rõ ràng.
- Không commit `.env`, local JDK, Gradle cache, Android local properties hoặc dữ liệu secret.

## 17. Troubleshooting

MongoDB không kết nối:

- Kiểm tra container Mongo tương ứng đã chạy.
- Kiểm tra URI đúng port mapped: `27018`, `27019`, `27020`, `27021`.
- Nếu chạy local không Docker, đảm bảo MongoDB service đang bật.

RabbitMQ không kết nối:

- Kiểm tra `EVENT_BROKER_URL`.
- Mở `http://localhost:15672` để xem queue/exchange.
- Với Docker Compose, service dùng URL nội bộ `amqp://rabbitmq:5672`.

Port bị chiếm trên Windows:

```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

CORS:

- Kiểm tra `FRONTEND_URL`.
- Web dev mặc định chạy `http://localhost:3000`.

Mobile không gọi được API:

- Không dùng `localhost` trên điện thoại thật.
- Dùng IP LAN của máy backend, ví dụ `http://192.168.1.10:5000/api`.
- Đảm bảo điện thoại và máy dev cùng mạng.

Android build dùng sai Java:

- Android/Gradle cần JDK 17.
- Nếu `JAVA_HOME` trỏ JDK 17 nhưng `java -version` vẫn là Java 8, dùng script trong `mobile/scripts`.
- Lệnh khuyến nghị: `npm run android:build`.

NFC không chạy trong Expo Go:

- Đây là giới hạn của Expo Go với native HCE.
- Dùng development build hoặc APK debug thật.

## 18. Checklist Sau Khi Clone

1. Cài Docker Desktop hoặc chuẩn bị MongoDB + RabbitMQ local.
2. Chạy `docker compose up --build`.
3. Seed bằng `docker compose run --rm seed-microservices`.
4. Chạy frontend bằng `cd frontend && npm install && npm start`.
5. Chạy mobile bằng `cd mobile && npm install && npm start`.
6. Đăng nhập bằng tài khoản demo.
7. Tạo booking, mở pass, quét QR/barcode/NFC để test check-in.
8. Đổi toàn bộ secret demo trước khi triển khai thật.

## 19. Trạng Thái Tài Liệu

File này thay thế các tài liệu project cũ như setup, quickstart, schema, microservices, security và mobile README. Nếu cần cập nhật tài liệu, hãy cập nhật trực tiếp tại đây để tránh lệch thông tin giữa nhiều file.
