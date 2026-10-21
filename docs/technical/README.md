# Tài liệu kỹ thuật TicketStage

- [Sơ đồ kiến trúc tổng thể](ARCHITECTURE_DIAGRAM.md): ảnh PNG, bản SVG chỉnh sửa được và giải thích các luồng theo kiến trúc waiting room.
- [Chi tiết AZ và phân phối token](AZ_AND_TOKEN_FLOWS.md): subnet, NAT, node groups, Redis admission, JWT lifecycle và các giới hạn implementation.

- [Hạ tầng và dự tính chi phí](INFRASTRUCTURE_AND_COST.md): thành phần AWS/Kubernetes, chi phí, kiến trúc và checklist vận hành.
- [API và luồng thực thi](API_AND_FLOWS.md): API public/internal, xác thực và các luồng đặt vé, thanh toán, check-in, event.
- Virtual waiting room được mô tả trong cả hai tài liệu trên: API/sequence nằm ở `API_AND_FLOWS.md`; Redis, Kubernetes và chi phí nằm ở `INFRASTRUCTURE_AND_COST.md`.
- [Sơ đồ Virtual Waiting Room](../architecture/waiting-room-architecture.md): ranh giới trách nhiệm, trạng thái token và hành vi khi dependency lỗi.
- `DEPLOYMENT_VARIABLES.local.md`: checklist GitHub Secrets, Variables và runtime environment. File này chỉ lưu cục bộ, đã bị Git ignore và không chứa secret thật.

Các README gần source code vẫn ở nguyên vị trí để thuận tiện đọc khi làm việc trong từng module. Mọi tài liệu kỹ thuật tổng quan mới phải đặt trong thư mục này.
