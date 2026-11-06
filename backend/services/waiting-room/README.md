# Waiting Room Service

Virtual waiting room dùng Redis cho lưu lượng checkout hot sale. Service sở hữu thứ tự hàng chờ và admission lease, không sở hữu tồn vé.

- Port: `5106`
- Public prefix: `/api/waiting-room`
- Dependency bắt buộc: Redis và JWT signing secret dùng chung với Gateway
- Có thể scale ngang vì quyết định admission dùng Redis script atomic

API Gateway kiểm tra token ngắn hạn trước khi chuyển request tạo booking. Booking Service tiếp tục đối chiếu event đã reserve từ Catalog với danh sách event trong admission token.
