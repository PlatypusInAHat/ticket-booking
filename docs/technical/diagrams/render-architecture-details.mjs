import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const root = new URL('./', import.meta.url);
const palette = { blue: '#28649d', orange: '#d3750e', green: '#218167', purple: '#7850ad', pink: '#b6417c' };
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
class Diagram {
  constructor(title, subtitle, height) {
    this.height = height;
    this.s = [`<svg xmlns="http://www.w3.org/2000/svg" width="2600" height="${height}" viewBox="0 0 2600 ${height}" role="img"><title>${esc(title)}</title><defs>${Object.entries(palette).map(([k, v]) => `<marker id="${k}" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0 0 9 4.5 0 9Z" fill="${v}"/></marker>`).join('')}</defs><rect width="2600" height="${height}" fill="white"/><g font-family="Segoe UI,DejaVu Sans,sans-serif">`];
    this.text(50, 55, 'TICKETSTAGE / ARCHITECTURE DETAILS', 22, palette.orange, 700);
    this.text(50, 109, title, 40, '#172b45', 700);
    this.text(50, 147, subtitle, 22);
  }
  text(x, y, t, size = 21, color = '#53677e', weight = 400) {
    this.s.push(`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}">${esc(t)}</text>`);
  }
  lines(x, y, ts, size = 21, gap = 30, color = '#53677e') {
    ts.forEach((t, i) => this.text(x, y + i * gap, t, size, color));
  }
  box(x, y, w, h, title, subtitle = '', color = 'blue', dash = false) {
    this.s.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${dash ? '#fffbf4' : '#f8fbfd'}" stroke="${palette[color]}" stroke-width="1.6"${dash ? ' stroke-dasharray="10 6"' : ''}/>`);
    if (title) this.text(x + 20, y + 32, title, 23, palette[color], 700);
    if (subtitle) this.text(x + 20, y + 63, subtitle, 20);
  }
  arrow(points, color = 'blue', dash = false, head = true) {
    this.s.push(`<polyline points="${points.map(p => p.join(',')).join(' ')}" fill="none" stroke="${palette[color]}" stroke-width="2.2"${dash ? ' stroke-dasharray="8 6"' : ''}${head ? ` marker-end="url(#${color})"` : ''}/>`);
  }
  chip(x, y, w, title, details, color = 'blue') {
    this.box(x, y, w, 110, '', '', color);
    this.s.push(`<rect x="${x + 14}" y="${y + 20}" width="46" height="46" rx="5" fill="${palette[color]}"/><path d="M${x + 24} ${y + 32}h26v22h-26zM${x + 30} ${y + 28}v30m14-30v30" fill="none" stroke="white" stroke-width="2"/>`);
    this.text(x + 75, y + 37, title, 22, '#172b45', 700);
    this.lines(x + 75, y + 67, details, 19, 26);
  }
  finish(name) {
    const svg = this.s.join('\n') + '</g></svg>';
    writeFileSync(new URL(`${name}.svg`, root), svg);
    if (process.argv[2]) {
      const { Resvg } = createRequire(import.meta.url)(process.argv[2]);
      for (const [suffix, width] of [['', 3900], ['-preview', 1560]]) {
        writeFileSync(new URL(`${name}${suffix}.png`, root), new Resvg(svg, {
          fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: true }
        }).render().asPng());
      }
    }
    console.log(`Rendered ${name}`);
  }
}

const az = new Diagram('Triển khai theo Availability Zone & đường mạng',
  'Mặc định module networking: 3 AZ • VPC 10.0.0.0/16 • vị trí pod minh họa, không phải kết quả scheduler', 2060);
az.chip(50, 190, 460, 'Web / Mobile → Cloudflare', ['WAF / rate limit / Turnstile', 'HTTPS đến API public'], 'orange');
az.chip(610, 190, 740, 'Internet-facing ALB · một load balancer', ['Hiện diện ở public subnets được chọn', 'Listener 443 → target IP pod gateway :5000'], 'purple');
az.chip(1450, 190, 1100, 'EKS control plane / AWS managed', ['Worker node groups dùng private_subnets; control plane không nằm trong worker node', 'API endpoint private/public và CIDR truy cập do cấu hình EKS quyết định'], 'blue');
az.arrow([[510, 245], [610, 245]]);
az.box(50, 335, 2500, 1035, 'AWS REGION / VPC', 'Tên AZ lấy động từ AWS; A/B/C là ký hiệu, không hard-code us-east-1a/b/c.');
const starts = [80, 910, 1740];
starts.forEach((x, i) => {
  const n = i + 1;
  az.box(x, 420, 780, 915, `AVAILABILITY ZONE ${'ABC'[i]}`, 'Một public subnet + một private subnet');
  az.box(x + 20, 508, 740, 192, `Public subnet · 10.0.${n}.0/24`, 'Public route table: 0.0.0.0/0 → Internet Gateway', 'green');
  az.chip(x + 38, 585, 345, 'ALB attachment', ['Nhận traffic HTTPS'], 'purple');
  az.chip(x + 400, 585, 342, `NAT Gateway ${'ABC'[i]}`, ['Elastic IP riêng'], 'orange');
  az.box(x + 20, 730, 740, 570, `Private subnet · 10.0.${n + 10}.0/24`, `Private route: 0.0.0.0/0 → NAT ${'ABC'[i]} cùng AZ`, 'blue');
  az.chip(x + 40, 817, 700, 'System node group · On-Demand', ['CoreDNS / controllers / monitoring theo scheduling', 'Node group trải trên danh sách private subnets']);
  az.chip(x + 40, 945, 700, 'General node group · Spot', ['Gateway / auth / catalog / notification / waiting room', 'Pod được gán theo workload=general'], 'orange');
  az.chip(x + 40, 1073, 700, 'Critical node group · On-Demand', ['Booking / check-in', 'workload=critical + capacity=on-demand'], 'green');
  az.text(x + 40, 1223, 'Pod → Service DNS → endpoint pod ở AZ bất kỳ', 20);
  az.text(x + 40, 1260, 'Không có queue hay signing key riêng cho mỗi AZ', 20, palette.orange, 600);
  az.arrow([[x + 567, 730], [x + 567, 695]], 'orange');
  az.arrow([[x + 200, 700], [x + 200, 723], [x + 12, 723], [x + 12, 1000], [x + 40, 1000]], 'blue');
});
az.box(50, 1405, 790, 245, 'DATA PLANE CHUNG', '', 'green');
az.lines(72, 1481, ['Redis: một primary endpoint dùng chung mọi pod.', 'Replica / failover chỉ có khi bật nhiều node + Multi-AZ.', 'Mặc định: enable_redis=false; 1 node nếu bật theo default.', 'RabbitMQ: endpoint chung; topology phụ thuộc mode.', 'Atlas: cluster ngoài VPC app; DB tách theo domain.'], 21, 32);
az.box(880, 1405, 790, 245, 'HA / SCALE THỰC TẾ TRONG REPO', '', 'blue');
az.lines(902, 1481, ['HPA → tăng pod; Cluster Autoscaler → tăng node.', 'Domain services: spread zone + hostname (soft).', 'Waiting room: mới spread hostname (ScheduleAnyway).', 'PDB bảo vệ khi disruption tự nguyện, không bảo vệ mất AZ.', 'Sơ đồ không có nghĩa mỗi AZ luôn có đủ mọi service.'], 21, 32);
az.box(1710, 1405, 840, 245, 'EGRESS / SECURITY', '', 'purple');
az.lines(1732, 1481, ['Public Internet: private pod → NAT cùng AZ → IGW.', 'Đích: VNPay/MoMo, SMTP, API ngoài, public Atlas...', 'Redis/MQ private: định tuyến nội bộ VPC, không qua NAT.', 'SG + NetworkPolicy phải cùng cho phép đường gọi.', 'Có NAT không đồng nghĩa SG đã mở egress Internet.'], 21, 32);
az.box(50, 1690, 2500, 260, 'CÁC ĐIỂM CHƯA ĐƯỢC COI LÀ HA HOÀN CHỈNH', 'Phân biệt ranh giới hạ tầng với bảo đảm vận hành.', 'orange', true);
az.lines(75, 1780, [
  '1. Hai pod waiting room có thể cùng AZ vì chưa có zone spread; soft scheduling cũng không bảo đảm trải đều khi thiếu capacity.',
  '2. Redis một node không chịu được mất node/AZ. Bật Multi-AZ cần replica và phải kiểm thử failover, RPO của queue.',
  '3. NAT được tạo một chiếc mỗi AZ trong module hiện tại; có chi phí cố định. Đây không phải cấu hình single-NAT tiết kiệm.',
  '4. Node group dùng nhiều subnet không có nghĩa pod tự động trải đều. Cần đối chiếu pod/node/zone sau triển khai.',
  '5. ALB certificate, SG/NetworkPolicy, secrets, broker mode và Atlas connectivity còn cần validate trên môi trường thật.'
], 22, 32);
az.text(55, 2007, 'Nguồn: ticket-infra/aws/terraform/modules/{vpc,eks,elasticache-redis} và k8s/base. Không thay đổi IaC trong lần bổ sung sơ đồ này.', 20);
az.finish('ticketstage-availability-zones');

const t = new Diagram('Admission token được cấp và phân phối như thế nào?',
  'Pull-based admission • không push token qua RabbitMQ • mọi replica dùng chung Redis state và signing secret', 2450);
t.chip(50, 190, 790, 'Auth access token · 15 phút mặc định', ['Auth service cấp; Authorization: Bearer <authToken>', 'Chứng minh người dùng, không thay cho quyền vào checkout'], 'blue');
t.chip(905, 190, 760, 'Entry token · opaque ID', ['24 byte ngẫu nhiên, base64url; trả về khi join', 'Tra cứu phiên chờ; entry TTL mặc định 3.600 giây'], 'orange');
t.chip(1730, 190, 820, 'Admission JWT · 600 giây mỗi lần ký', ['Waiting room cấp; x-waiting-room-token', 'Gateway xác minh; entryId chỉ tạo được một booking'], 'green');

const centers = [195, 620, 1045, 1470, 1895, 2320];
const names = ['Web / Mobile', 'API Gateway', 'Waiting Room', 'Redis chung', 'Booking', 'Catalog / Mongo'];
centers.forEach((x, i) => {
  t.box(x - 135, 355, 270, 75, names[i], '', i === 3 ? 'purple' : 'blue');
  t.arrow([[x, 430], [x, 1660]], i === 3 ? 'purple' : 'blue', true, false);
});
function message(from, to, y, title, detail = '', color = 'blue', back = false) {
  const x1 = centers[from], x2 = centers[to];
  const lx = Math.min(x1, x2) + 15;
  t.arrow([[x1, y], [x2, y]], color, back);
  t.text(lx, y - 13, title, 20, palette[color], 600);
  if (detail) t.text(lx, y + 27, detail, 18);
}
message(0, 1, 480, '1 · POST /api/waiting-room/join', 'Auth token + eventIds + deviceFingerprint');
message(1, 2, 554, 'Forward /join', 'Service xác thực JWT đăng nhập');
message(2, 3, 628, '2 · Lưu entry + ZADD queue', 'Identity: user + fingerprint + event set', 'orange');
message(2, 0, 702, '202 · { entryToken, campaignId }', 'Response đi ngược qua gateway; client giữ entryToken trong luồng checkout', 'orange', true);
message(0, 2, 793, '3 · GET /api/waiting-room/{entryToken}/status qua gateway', 'Client polling mỗi 5 giây khi còn waiting');
message(2, 3, 875, '4 · Lua eval atomic', 'Kiểm tra rank / active / recent; cấp lease', 'purple');
message(3, 2, 949, 'waiting hoặc admitted', 'Không có worker tự push token cho client', 'purple', true);
message(2, 0, 1030, '5 · admitted → ký JWT → response { accessToken, expiresIn }', 'Chỉ client đang poll nhận token; đi qua gateway; status response có Cache-Control: no-store', 'green', true);
message(0, 1, 1125, '6 · POST /api/bookings', 'Auth Bearer + x-waiting-room-token', 'green');
t.box(480, 1167, 790, 76, '', '', 'orange', true);
t.text(499, 1195, 'Gateway: chữ ký + iss + aud + exp + userId trùng auth JWT', 20, palette.orange, 600);
t.text(499, 1224, 'Không gọi Redis để kiểm tra lease/revoke ở request booking hiện tại', 19);
message(1, 4, 1294, '7 · Forward booking + x-waiting-room-entry-id + x-waiting-room-event-ids', 'Những header này mang kết quả xác minh tại gateway', 'green');
message(4, 5, 1381, '8 · Reserve tồn kho atomic', 'Catalog trả event thật / reservation');
t.box(1760, 1422, 780, 111, '', '', 'green');
t.lines(1780, 1451, ['9 · Booking kiểm tra event đã được admission;', 'save booking + outbox trong Mongo transaction;', 'unique index entryId ngăn admission tạo booking thứ hai.'], 20, 29);
message(4, 0, 1591, '201 Booking → tạo phiên thanh toán → redirect VNPay/MoMo', 'Trả về qua gateway; payment webhook xác nhận thanh toán sau đó', 'green', true);

t.box(50, 1705, 790, 303, 'ĐIỀU KIỆN ADMISSION TRONG LUA', '', 'purple');
t.lines(73, 1780, ['Cùng campaign = hash(eventIds đã chuẩn hóa).', 'active < 200; recent trong 60 giây < 120.', 'rank < ceil(120 / 60) = 2 theo cấu hình mặc định.', 'Được cấp: remove queue; add active + recent;', 'ghi state=admitted và admittedAt.', 'Lease active: now + 600 giây.', 'Các ngưỡng tính theo campaign, không toàn hệ thống.'], 21, 31);
t.box(905, 1705, 760, 303, 'JWT PAYLOAD & KEY', '', 'green');
t.lines(928, 1780, ['entryId · eventIds · userId · fingerprintHash', 'type=waiting-room-access · jti · iat · exp', 'iss=ticketstage-waiting-room', 'aud=ticketstage-booking', 'Ký HMAC theo jsonwebtoken mặc định (HS256).', 'WAITING_ROOM_TOKEN_SECRET, fallback JWT_SECRET.', 'JWT được ký, không mã hóa payload.'], 21, 31);
t.box(1730, 1705, 820, 303, 'TOKEN QUA CÁC AZ', '', 'blue');
t.lines(1753, 1780, ['Join ở AZ A, poll ở AZ B vẫn đọc cùng Redis.', 'Token do pod B ký được gateway C kiểm tra.', 'Mọi verifier phải có cùng secret đúng phiên bản.', 'Client gửi token trong header khi tạo booking.', 'Gateway không cần sticky session để verify JWT.', 'Unique index MongoDB là chốt chống dùng lại.', 'jti khác nhau không bỏ qua unique entryId.'], 21, 31);

t.box(50, 2050, 2500, 285, 'GIỚI HẠN HIỆN TẠI CẦN ĐỌC CÙNG SƠ ĐỒ', 'Đây là mô tả code hiện tại, không coi các bước hardening là đã hoàn thành.', 'orange', true);
t.lines(75, 2143, [
  'TTL: mỗi poll admitted ký lại JWT +600s; exp có thể vượt thời điểm hết lease. Gateway hiện không kiểm tra lại lease Redis.',
  'Owner: /status xác thực login nhưng chưa đối chiếu entry.userId; fingerprintHash có trong JWT nhưng gateway chưa so sánh device.',
  'Capacity: booking thành công không xóa active lease; slot thu hồi theo expiry khi có poll. Mongo unique index không ghi Redis state=used.',
  'Fairness: FIFO theo timestamp + random tie-break; stale queue member chưa được dọn và campaign theo tập event có thể chia nhỏ quota.',
  'Phân phối: token chỉ trả về khi client poll; chưa có SSE/WebSocket, key rotation theo kid, revoke list hoặc handshake lease tại booking.'
], 22, 33);
t.text(55, 2393, 'Nguồn: waitingRoomService.js, waitingRoomToken.js, api-gateway/server.js, bookingService.js và Checkout.tsx / mobile App.js.', 20);
t.finish('ticketstage-token-distribution');
