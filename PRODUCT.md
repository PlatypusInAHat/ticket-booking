# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Khách mua vé (ưu tiên số một):** người dùng tại Việt Nam tìm sự kiện (concert, festival, thể thao, show), mua vé, thanh toán và mở vé điện tử (QR, barcode, NFC) khi đến cổng.
- **Ban tổ chức / admin:** nhiều công ty cùng quản lý sự kiện, loại vé, đơn đặt vé, thanh toán và thống kê trên một nền tảng.
- **Nhân viên check-in:** quét QR, barcode, NFC hoặc nhập mã thủ công tại cổng, chủ yếu trên app mobile.
- **Người đánh giá đồ án:** giảng viên/hội đồng xem demo. Sản phẩm phải đứng vững như một sản phẩm thương mại thật, không phải bản demo học thuật.

## Product Purpose

TicketStage là nền tảng đặt vé sự kiện gồm web, app mobile và backend microservices. Đây là đồ án nhưng được làm theo chuẩn sản phẩm thật: trải nghiệm, nội dung và độ tin cậy phải thuyết phục như một dịch vụ thương mại sắp ra thị trường.

Thành công nghĩa là khách tìm được sự kiện và có vé trong tay nhanh, không lỗi; ban tổ chức tự vận hành được sự kiện của mình; và toàn bộ luồng (mua → thanh toán → vé → check-in) chạy trọn vẹn khi demo.

## Positioning

- **Đa ban tổ chức:** nhiều công ty cùng đăng và quản lý sự kiện trên một nền tảng chung, mỗi bên có dữ liệu và thống kê riêng.
- **Độ tin cậy từ kiến trúc:** microservices với database riêng cho từng service, domain event qua RabbitMQ, giữ chỗ có thời hạn, health check, metrics và tracing đầy đủ. Vé và tồn kho không bị bán trùng hay mất đồng bộ.

## Operating Context

- Thị trường Việt Nam: giá theo VND, ngày theo định dạng `vi-VN`; thanh toán VNPay/MoMo.
- Web (React) phục vụ khách và admin; app mobile (Expo/React Native, Android và iOS) có luồng khách và luồng nhân viên check-in. App mobile là bề mặt riêng, có theme riêng (`mobile/src/theme.js`).
- Email giao dịch: chào mừng, quên mật khẩu, xác nhận thanh toán, hủy đơn, nhắc lịch sự kiện.

## Capabilities and Constraints

- Trang web hiện có: Home, Events, EventDetail, Cart, Checkout, PaymentResult, Login, Register, ForgotPassword, ResetPassword, Dashboard, AdminDashboard, ApiManagement.
- Vé điện tử: QR, barcode, NFC payload (Android HCE).
- Booking có giữ chỗ tạm và hết hạn tự động; hủy hoặc hết hạn thì trả vé về kho.
- **Ngôn ngữ:** giao diện phải song ngữ Việt/Anh. Bản hiện tại chỉ có tiếng Anh, chưa có i18n. Ngôn ngữ mặc định chưa quyết định.

## Brand Commitments

- Tên sản phẩm: **TicketStage**.
- Định vị trong copy hiện tại: "Premium Event Ticketing". Copy hiện có chưa được xác nhận là giọng thương hiệu chính thức.

## Evidence on Hand

- Không có khách hàng, đối tác, đánh giá hay số liệu kinh doanh thật.
- Các con số trên trang chủ ("500K+ tickets sold", "1,200+ live events", "4.9 avg. rating", "Over 1,200 live events this season") là **placeholder**. Không được trích dẫn hay trình bày như bằng chứng thật; cần thay hoặc gắn nhãn rõ là dữ liệu mẫu.
- Dữ liệu sự kiện mẫu (`frontend/src/data/events`) là dữ liệu demo.
- Sơ đồ kiến trúc thật: `docs/architecture/system-architecture.svg`, `docs/architecture/delivery-flow.svg`.

## Product Principles

1. **Khách có vé trước tiên.** Mọi quyết định ưu tiên con đường ngắn nhất từ tìm sự kiện đến cầm vé điện tử trong tay.
2. **Chuẩn sản phẩm thật, không phải demo.** Mọi màn hình phải trông và hoạt động như dịch vụ thương mại, kể cả trạng thái lỗi, rỗng và đang tải.
3. **Trung thực về dữ liệu.** Không bịa số liệu, đánh giá hay đối tác; dữ liệu mẫu phải là dữ liệu mẫu.
4. **Độ tin cậy thể hiện được.** Tồn kho, giữ chỗ, trạng thái thanh toán và vé phải luôn rõ ràng, nhất quán với backend.
5. **Song ngữ ngang hàng.** Tiếng Việt và tiếng Anh là hai ngôn ngữ đầy đủ, không phải một bản dịch phụ.
