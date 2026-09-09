# API và luồng thực thi TicketStage

## 1. Quy ước chung

- Base URL public: `https://<api-domain>/api`.
- API Gateway là entrypoint duy nhất cho web/mobile. Gateway route theo prefix đến microservice, thêm correlation ID, timeout/retry upstream và không để client gọi trực tiếp service nội bộ.
- Phản hồi thành công dùng cấu trúc `success`, `statusCode`, `data`, `message`; client cần lấy payload từ `data`.
- API cần đăng nhập dùng `Authorization: Bearer <accessToken>`.
- Access token và refresh token do auth-service phát hành; thời gian sống runtime theo `JWT_ACCESS_EXPIRE` và `JWT_REFRESH_EXPIRE`.
- API internal chỉ dành cho service-to-service, dùng `x-internal-api-key: <INTERNAL_API_KEY>`; không public qua Ingress.
- Các write endpoint quan trọng có rate limit; booking còn có Turnstile/device risk score, purchase limit và inventory reservation.

## 2. Định tuyến qua API Gateway

| Public prefix | Service sở hữu | Mục đích |
| --- | --- | --- |
| `/api/auth`, `/api/users`, `/api/admin` | auth-service | Đăng nhập, profile, quản trị. |
| `/api/companies`, `/api/events`, `/api/tickets`, `/api/upload` | catalog-service | Company, sự kiện, loại vé, upload ảnh. |
| `/api/bookings`, `/api/payment` | booking-service | Booking, pass, QR/barcode/NFC, thanh toán, refund. |
| `/api/checkin` | checkin-service | Quét/check-in và offline sync. |
| `/api/notifications` | notification-service | Đăng ký nhận tin và preference. |

Gateway health:

```text
GET /health/live          process đang chạy
GET /health/ready         readiness; có thể kiểm tra upstream khi bật GATEWAY_READY_CHECK_UPSTREAMS
GET /health/dependencies  internal key hoặc gateway admin token
GET /metrics              Prometheus metrics
GET /api-docs             Swagger UI gateway
```

## 3. API public chính

### Auth và người dùng

| Method | Endpoint | Auth | Mô tả |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Không | Tạo tài khoản. |
| `POST` | `/api/auth/login` | Không | Đăng nhập, trả token/session data. |
| `POST` | `/api/auth/forgot-password` | Không | Gửi email reset password. |
| `PUT` | `/api/auth/reset-password/:token` | Không | Đặt lại mật khẩu. |
| `POST` | `/api/auth/refresh-token` | Refresh token | Rotate/cấp token mới. |
| `POST` | `/api/auth/logout` | Có | Kết thúc phiên hiện tại. |
| `GET`, `PUT` | `/api/users/profile` | Có | Xem/cập nhật profile. |

### Catalog sự kiện và vé

| Method | Endpoint | Auth/role | Mô tả |
| --- | --- | --- | --- |
| `GET` | `/api/events` | Không | List/filter/paginate sự kiện. |
| `GET` | `/api/events/:id` | Không | Chi tiết sự kiện. |
| `POST` | `/api/events`, `/api/events/bundle` | Admin/organizer | Tạo event hoặc event kèm ticket/session. |
| `PUT`, `DELETE` | `/api/events/:id` | Admin/organizer | Cập nhật/xóa event. |
| `GET` | `/api/tickets`, `/api/tickets/:id` | Không | List/chi tiết ticket public. |
| `POST`, `PUT`, `DELETE` | `/api/tickets`, `/api/tickets/:id` | Admin/organizer | Quản lý ticket và seat map. |
| `GET`, `POST`, `PUT` | `/api/companies`, `/api/companies/:id` | Theo role | Company/organizer. |
| `POST` | `/api/upload/image` | Có | Upload asset catalog. |

Các query list điển hình: `page`, `limit`, `search`, `sort`, `eventType`, `city`, `date`, `status`. Client không được dựa vào field nhạy cảm của ticket; catalog serializer chỉ trả public ticket format.

### Booking, pass và refund

| Method | Endpoint | Auth | Mô tả |
| --- | --- | --- | --- |
| `POST` | `/api/bookings` | Có | Tạo booking pending và giữ inventory. |
| `GET` | `/api/bookings` | Có | Danh sách booking của người dùng, trả `{ bookings, pagination }`. |
| `GET` | `/api/bookings/:id` | Có | Chi tiết booking thuộc chủ sở hữu/role hợp lệ. |
| `GET` | `/api/bookings/:id/passes` | Có | Danh sách pass. |
| `GET` | `/api/bookings/:id/passes/:passId` | Có | Chi tiết pass. |
| `GET` | `/api/bookings/:id/passes/:passId/qr.png` | Có | Ảnh QR. |
| `GET` | `/api/bookings/:id/passes/:passId/barcode.png` | Có | Ảnh barcode. |
| `GET` | `/api/bookings/:id/passes/:passId/nfc-payload` | Có | NFC payload đã kiểm soát quyền. |
| `POST`/`PUT` | `/api/bookings/:id/cancel` | Có | Hủy booking khi trạng thái cho phép. |
| `POST` | `/api/bookings/:id/refund-request` | Có | Yêu cầu hoàn tiền, có lý do 10-500 ký tự. |
| `GET` | `/api/bookings/queue/status` | Admin | Chỉ số booking queue. |
| `GET`, `POST` | `/api/bookings/promotions` | Admin | Danh sách/tạo promotion. |
| `POST` | `/api/bookings/promotions/preview` | Có | Preview áp dụng promotion. |

Payload tạo booking tối thiểu:

```json
{
  "tickets": [{ "ticketId": "<mongo-id>", "quantity": 2, "seatCodes": ["A1", "A2"] }],
  "paymentMethod": "vnpay",
  "source": "web",
  "promoCode": "OPTIONAL",
  "turnstileToken": "<token khi bật>",
  "deviceFingerprint": "<optional fingerprint>"
}
```

### Thanh toán

| Method | Endpoint | Auth | Mô tả |
| --- | --- | --- | --- |
| `POST` | `/api/payment/session` | Có | Tạo payment session cho `vnpay`, `momo` hoặc mock khi cho phép. |
| `POST` | `/api/payment/process` | Có | Hoàn tất mock payment; production phải đặt `ALLOW_MOCK_PAYMENT=false`. |
| `GET` | `/api/payment/:bookingId` | Có | Trạng thái payment/booking. |
| `GET` | `/api/payment/return/vnpay` | Provider/browser | Return URL sau VNPay. |
| `GET` | `/api/payment/webhooks/vnpay` | VNPay | IPN/webhook, xác minh chữ ký. |
| `POST` | `/api/payment/webhooks/momo` | MoMo | Webhook, xác minh chữ ký. |

### Check-in staff/admin

| Method | Endpoint | Role | Mô tả |
| --- | --- | --- | --- |
| `POST` | `/api/checkin/validate` | `admin`, `staff` | Validate QR/barcode/NFC, chưa check-in. |
| `POST` | `/api/checkin` | `admin`, `staff` | Xác nhận check-in. |
| `GET` | `/api/checkin/events` | `admin`, `staff` | Danh sách event có thể check-in. |
| `GET` | `/api/checkin/stats` | `admin`, `staff` | Thống kê check-in. |
| `POST` | `/api/checkin/offline/manifest` | `admin`, `staff` | Tạo manifest offline theo event/device. |
| `POST` | `/api/checkin/offline/sync` | `admin`, `staff` | Đồng bộ tối đa 100 lần scan offline/batch. |

Scan body chấp nhận một trong `code`, `scanToken`, `nfcPayload`; `method` là `qr`, `barcode`, `nfc` hoặc `manual`.

### Notification và admin

| Method | Endpoint | Auth | Mô tả |
| --- | --- | --- | --- |
| `POST` | `/api/notifications/subscribe` | Không | Subscribe email. |
| `GET`/`POST` | `/api/notifications/unsubscribe` | Link/token | Unsubscribe. |
| `PUT` | `/api/notifications/preferences` | Có | Preference notification cá nhân. |
| `GET` | `/api/admin/stats`, `/api/admin/bookings`, `/api/admin/users` | Admin | Dashboard và dữ liệu quản trị. |
| `PUT` | `/api/admin/bookings/:id/payment`, `/api/admin/bookings/:id/refund-request` | Admin | Điều phối payment/refund. |
| `PUT` | `/api/admin/users/:id/role` | Admin | Phân quyền người dùng. |

## 4. Internal API contract

Internal API không được gọi từ frontend/mobile. Booking-service gọi catalog qua HTTP nội bộ:

```text
POST /internal/catalog/tickets/reserve
POST /internal/catalog/tickets/release
POST /internal/catalog/events/revenue
```

Các internal route khác phục vụ dashboard/worker gồm `/internal/booking/*`, `/internal/checkin/*`, `/internal/notifications/*`. Chúng bắt buộc `x-internal-api-key`, timeout/retry/circuit breaker từ shared internal HTTP client và NetworkPolicy chỉ cho phép service cần thiết kết nối.

## 5. Luồng đăng nhập và refresh token

```text
Client -> POST /api/auth/login -> auth-service
auth-service -> hash/verify password + account lock/rate limit
auth-service -> access token + refresh token
Client -> gọi API bằng Bearer access token
access token hết hạn -> POST /api/auth/refresh-token -> rotate token
logout -> revoke/clear session theo auth service
```

Mật khẩu dùng bcrypt cùng pepper server-side. Không trả password hash, secret pass/QR/NFC hoặc internal key qua API public.

## 6. Luồng đặt vé chống oversell

```text
1. Client POST /api/bookings
2. Gateway -> booking-service
3. Booking kiểm tra auth, rate limit, Turnstile/risk score, purchase limit
4. Booking tạo inventoryReservationId và gọi catalog internal reserve
5. Catalog:
   - GA: atomic findOneAndUpdate với availableSeats >= quantity
   - Reserved seat: SeatLock unique + TTL, optimistic concurrency seat map
   - tạo InventoryReservation(status=active)
6. Booking ghi Booking(pending), pass snapshot và outbox trong Mongo transaction
7. Trả booking pending + expiresAt cho client
```

Nếu promo validation hoặc Mongo transaction thất bại, booking-service gọi release với cùng `inventoryReservationId`. Catalog chỉ cho phép transition `active -> released` một lần; retry, event giao lại hoặc fallback không thể trả inventory hai lần.

Booking pending hết hạn được worker claim atomically (`pending` + `expiresAt <= now`) rồi publish `BOOKING_EXPIRED`. Nếu broker tạm lỗi, outbox worker sẽ publish lại; fallback release vẫn idempotent.

## 7. Luồng thanh toán và phát hành vé

```text
Client -> POST /api/payment/session
booking-service -> tạo payment record + URL/deeplink VNPay/MoMo
Client/provider -> return URL hoặc webhook có chữ ký
booking-service -> verify signature + atomically pending -> confirmed/completed
booking-service -> transaction + outbox PAYMENT_COMPLETED
RabbitMQ -> catalog subscriber: convert reservation, ghi revenue, convert seat lock
RabbitMQ -> checkin subscriber: cập nhật booking projection cục bộ
RabbitMQ -> notification subscriber: xếp email mua vé thành công
```

Webhook có idempotency theo transaction/provider reference. Khi event consumer lỗi, RabbitMQ retry queue chờ `EVENT_RETRY_DELAY_MS`; quá `EVENT_MAX_RETRIES` chuyển DLQ. Consumer lưu processed event để deduplicate.

## 8. Luồng hủy/hoàn tiền

```text
User/admin cancel hoặc booking hết hạn
-> booking state transition có điều kiện
-> outbox BOOKING_CANCELLED hoặc BOOKING_EXPIRED
-> catalog release inventory với inventoryReservationId
-> checkin projection hủy pass
-> notification gửi trạng thái phù hợp
```

Với booking đã thanh toán, release chỉ diễn ra theo luồng refund/cancel cho phép `restoreRevenue`; catalog cho phép `converted -> released` đúng một lần trong trường hợp này.

## 9. Luồng check-in QR, barcode, NFC và offline

```text
Staff mobile/web -> POST /api/checkin/validate
-> checkin-service đọc booking projection cục bộ
-> kiểm tra pass status, chữ ký/hash QR/barcode/NFC, event và thời hạn
-> trả hợp lệ hoặc lý do từ chối

Staff -> POST /api/checkin
-> atomic update pass issued -> checked_in
-> ghi CheckInLog gồm gate/device/method
-> lần scan sau bị từ chối hoặc trả trạng thái đã check-in
```

Offline mode: staff tải manifest theo `eventId` và `deviceId`; scan local lưu `localId`; khi có mạng gọi `/api/checkin/offline/sync`. `localId` là idempotency key để đồng bộ lại không tạo check-in trùng.

## 10. Luồng event và observability

```text
Service transaction -> Outbox document -> outbox worker -> RabbitMQ topic exchange
RabbitMQ -> queue riêng từng service -> idempotency claim -> handler -> ack
handler lỗi -> retry queue -> DLQ sau ngưỡng retry
```

Mỗi HTTP request và event mang correlation/trace context. Theo dõi qua `/metrics`, OpenTelemetry trace, Grafana và alert: booking fail rate, webhook fail, queue backlog, outbox pending lâu, HPA max replica và pod restart.

## 11. Mã trạng thái quan trọng

| Mã | Ý nghĩa client cần xử lý |
| --- | --- |
| `200/201` | Thành công. |
| `400` | Payload, trạng thái vé hoặc sale window không hợp lệ. |
| `401/403` | Thiếu token hoặc không đủ quyền. |
| `409` | Ghế/vé vừa bị người khác giữ, booking không còn payable hoặc webhook duplicate conflict. Refresh inventory, không tự tạo booking lặp vô hạn. |
| `429` | Rate limit, purchase limit hoặc queue bận. Tôn trọng `Retry-After`. |
| `502/503` | Upstream, store rate-limit/queue hoặc service dependency không sẵn sàng. Retry có backoff và kiểm tra booking/payment status trước khi tạo lại. |

## 12. Nguồn code đối chiếu

- Gateway routing: `backend/microservices/api-gateway/server.js`.
- Route public: `backend/services/*/src/routes/`.
- Inventory: `backend/services/catalog/src/services/catalogInventoryService.js`.
- Booking/payment: `backend/services/booking/src/services/bookingService.js`, `paymentService.js`.
- Event bus/outbox: `backend/shared/eventBus.js`, `backend/shared/domainEventPublisher.js`.
- Check-in: `backend/services/checkin/src/services/checkinService.js`.
