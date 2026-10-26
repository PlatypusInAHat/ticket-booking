import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Native SVG keeps every label, icon and connector editable in vector editors.
const W = 2800;
const H = 2040;
const out = new URL('./', import.meta.url);
const c = { ink: '#172b45', muted: '#53677e', line: '#bccbdb', blue: '#28649d',
  orange: '#df790c', purple: '#7850ad', green: '#248268', pink: '#bc4381', teal: '#287c8c' };
const fragments = [];
const esc = (v) => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const add = (s) => fragments.push(s);
const text = (x, y, value, size = 21, color = c.ink, weight = 400, anchor = 'start') =>
  add(`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}">${esc(value)}</text>`);
function lines(x, y, values, size = 19, color = c.muted, gap = 27, anchor = 'start') {
  values.forEach((v, i) => text(x, y + i * gap, v, size, color, 400, anchor));
}
function box(x, y, w, h, fill = '#fff', stroke = c.line, dash = '') {
  add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="1.6"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`);
}
function region(x, y, w, h, title, subtitle, stroke = c.blue, fill = '#f7faff', dash = '') {
  box(x, y, w, h, fill, stroke, dash);
  text(x + 20, y + 30, title, 21, stroke, 700);
  if (subtitle) text(x + 20, y + 57, subtitle, 17, c.muted);
}
const glyphs = {
  cloud: '<path d="M14 43h37a10 10 0 0 0 0-20 16 16 0 0 0-30-2 11 11 0 0 0-7 22Z"/>',
  browser: '<rect x="10" y="12" width="44" height="35" rx="2"/><path d="M10 21h44M16 17h2m4 0h2M25 47v7m-9 0h34M20 29h24m-24 8h17"/>',
  mobile: '<rect x="19" y="7" width="27" height="50" rx="4"/><path d="M26 13h13M29 50h7"/><rect x="25" y="24" width="15" height="15"/>',
  shield: '<path d="m32 8 20 8v16c0 12-20 23-20 23S12 44 12 32V16Z"/><path d="m23 31 6 6 13-14"/>',
  gateway: '<path d="M12 15h13v34H12m40-34H39v34h13M7 32h50M19 26l6 6-6 6m26-12 6 6-6 6"/>',
  lb: '<rect x="24" y="23" width="16" height="17"/><path d="M32 8v15M9 55V44h46v11M32 40v15M16 12h32"/>',
  cube: '<path d="m32 8 23 13v26L32 59 9 47V21Zm0 26 23-13M32 34 9 21m23 13v25M20 15l24 14v12"/>',
  db: '<ellipse cx="32" cy="14" rx="22" ry="8"/><path d="M10 14v36c0 10 44 10 44 0V14M10 31c0 10 44 10 44 0M10 45c0 10 44 10 44 0"/>',
  queue: '<path d="M7 18h50M7 46h50"/><rect x="11" y="24" width="9" height="16"/><rect x="27" y="24" width="9" height="16"/><rect x="43" y="24" width="9" height="16"/>',
  bucket: '<ellipse cx="32" cy="14" rx="23" ry="8"/><path d="m9 14 5 37c0 9 36 9 36 0l5-37M22 29h20v17H22Z"/>',
  key: '<circle cx="23" cy="24" r="13"/><path d="m33 34 22 22m-12-12 7-7m-2 12 7-7"/>',
  email: '<rect x="8" y="15" width="48" height="34" rx="3"/><path d="m8 17 24 19 24-19M8 49l18-18m30 18L38 31"/>',
  chart: '<path d="M10 9v45h46M17 41l10-13 10 5 16-20"/><path d="M43 13h10v10"/>',
  trace: '<circle cx="13" cy="17" r="6"/><circle cx="49" cy="17" r="6"/><circle cx="31" cy="48" r="6"/><path d="M19 17h24M16 23l12 19m17-19L34 42"/>',
  git: '<circle cx="17" cy="12" r="5"/><circle cx="17" cy="51" r="5"/><circle cx="47" cy="19" r="5"/><path d="M17 17v29m30-22v4c0 11-30 4-30 16"/>',
  scan: '<path d="M21 9H9v12m34-12h12v12M9 43v12h12m22 0h12V43"/><path d="m20 32 8 8 17-18"/>',
  card: '<rect x="7" y="13" width="50" height="38" rx="4"/><path d="M7 24h50M16 40h13m7 0h10"/>',
  bell: '<path d="M15 43h34l-5-8V24a12 12 0 0 0-24 0v11Zm12 8a5 5 0 0 0 10 0M30 8h4"/>',
};
function icon(x, y, kind, color, size = 58) {
  add(`<g transform="translate(${x} ${y}) scale(${size / 64})"><rect width="64" height="64" rx="3" fill="${color}"/><g fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${glyphs[kind] || glyphs.cube}</g></g>`);
}
function card(x, y, w, title, detail, kind = 'cube', color = c.orange, h = 108) {
  box(x, y, w, h);
  icon(x + 16, y + 18, kind, color, 54);
  text(x + 84, y + 35, title, 21, c.ink, 700);
  lines(x + 84, y + 62, detail, 17, c.muted, 24);
}
function path(points, color = c.blue, dashed = false, arrow = true) {
  add(`<polyline points="${points.map(p => p.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="2.3" stroke-linejoin="round"${dashed ? ' stroke-dasharray="8 6"' : ''}${arrow ? ` marker-end="url(#arrow-${Object.keys(c).find(k => c[k] === color) || 'blue'})"` : ''}/>`);
}
function label(x, y, value, color = c.blue, size = 17) {
  const w = value.length * size * 0.53 + 18;
  add(`<rect x="${x - 9}" y="${y - size + 1}" width="${w}" height="${size + 9}" rx="4" fill="#fff" opacity=".97"/>`);
  text(x, y, value, size, color, 600);
}
function badge(x, y, number, title, detail) {
  add(`<circle cx="${x}" cy="${y}" r="18" fill="${c.orange}"/>`);
  text(x, y + 6, number, 20, '#fff', 700, 'middle');
  text(x + 30, y + 4, title, 20, c.ink, 700);
  lines(x + 30, y + 32, detail, 18);
}

add(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc">
<title id="title">TicketStage — Kiến trúc tổng thể và Virtual Waiting Room</title>
<desc id="desc">Website qua Cloudflare, ALB, API Gateway trên EKS. Hàng chờ tự quản lý bằng Redis cấp token checkout. Năm domain service sở hữu database MongoDB riêng, đồng bộ bằng RabbitMQ và outbox. Bao gồm thanh toán, email, GitOps, autoscaling và quan sát hệ thống. Sơ đồ phản ánh cấu hình repository, không chứng nhận deployment đang hoạt động.</desc>
<defs>${Object.entries(c).map(([key, color]) => `<marker id="arrow-${key}" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0 0 9 4.5 0 9Z" fill="${color}"/></marker>`).join('')}</defs>
<g font-family="'Segoe UI', 'DejaVu Sans', sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>`);
text(55, 64, 'TICKETSTAGE', 24, c.orange, 800);
text(55, 115, 'Kiến trúc tổng thể hệ thống bán vé', 43, c.ink, 750);
text(55, 153, 'Hàng chờ tự quản lý • Microservices trên Amazon EKS • Website • GitOps', 23, c.muted);
text(2745, 65, 'ARCHITECTURE / 01', 19, c.muted, 650, 'end');
text(2745, 99, 'Đối chiếu repository · 20.10.2026', 18, c.muted, 400, 'end');

region(245, 195, 700, 163, 'GIAO DIỆN WEB / TRANG CHỜ', '', c.green, '#f6fbf8');
card(267, 239, 295, 'CloudFront', ['Phân phối static web'], 'cloud', c.purple, 97);
card(626, 239, 295, 'Amazon S3', ['React build / assets'], 'bucket', c.green, 97);
path([[562, 287], [626, 287]], c.green);
text(990, 225, 'AWS / VPC', 24, c.blue, 700);
text(990, 258, 'ALB public → ứng dụng trong private subnets', 20, c.muted);
text(990, 288, 'DNS • Security Groups • NAT/egress theo môi trường', 19, c.muted);
text(2065, 225, 'DỮ LIỆU & TÍCH HỢP', 24, c.green, 700);
text(2065, 258, 'Atlas nằm ngoài VPC ứng dụng;', 19, c.muted);
text(2065, 285, 'kết nối mạng theo cấu hình môi trường.', 19, c.muted);

region(665, 345, 1330, 1050, 'AWS VPC', 'Public ingress + private application / data subnets', c.blue, '#f8fbff', '12 7');
region(951, 425, 1015, 783, 'AMAZON EKS 1.35', 'Namespace ticketstage • Kubernetes Service DNS • HTTP nội bộ', c.blue, '#fff');
region(2040, 345, 342, 915, 'MONGODB ATLAS', 'Database riêng theo domain', c.green, '#f7fbf9');
text(2425, 377, 'DỊCH VỤ NGOÀI', 20, c.muted, 700);

// All entry traffic follows the same public boundary.
card(55, 510, 190, 'Client', ['Website', 'QR · barcode'], 'browser', c.teal, 132);
card(295, 510, 320, 'Cloudflare', ['DNS · CDN · WAF', 'DDoS · rate limit · Turnstile'], 'shield', c.orange, 132);
card(700, 510, 220, 'AWS ALB', ['Ingress HTTPS', 'Gateway :5000'], 'lb', c.purple, 132);
region(990, 498, 348, 224, 'API GATEWAY / BOUNCER', '', c.orange, '#fffbf4', '10 6');
card(1007, 542, 314, 'API Gateway', ['JWT + token admission', 'Kiểm tra owner / TTL'], 'gateway', c.purple, 110);
text(1008, 683, 'Chặn POST /api/bookings thiếu token', 16, c.orange, 600);
text(1008, 707, 'Auth / đọc vé / webhook vẫn định tuyến', 16, c.muted);
path([[245, 576], [295, 576]]);
path([[615, 576], [700, 576]]);
path([[920, 576], [990, 576]]);
label(632, 557, 'TLS', c.blue, 16);
path([[455, 510], [455, 394], [414, 394], [414, 336]], c.green);
label(465, 402, 'Tải giao diện / assets', c.green);

// Gateway routes form a bus, separate from DB and event traffic.
path([[1338, 588], [1415, 588]], c.blue, false, false);
path([[1415, 525], [1415, 1125]], c.blue, false, false);
const domains = [
  { y: 477, name: 'Auth Service', port: 5101, info: ['Đăng nhập · refresh · phân quyền'], db: 'ticket-auth', data: ['Users · sessions'], icon: 'key' },
  { y: 627, name: 'Catalog Service', port: 5102, info: ['Event · loại vé · tồn kho atomic'], db: 'ticket-catalog', data: ['Events · tickets · seat locks'], icon: 'browser' },
  { y: 777, name: 'Booking Service', port: 5103, info: ['Giữ vé · payment · webhook'], db: 'ticket-booking', data: ['Bookings · payments · outbox'], icon: 'card' },
  { y: 927, name: 'Check-in Service', port: 5104, info: ['QR / barcode · chống check-in lặp'], db: 'ticket-checkin', data: ['Projection · devices · logs'], icon: 'scan' },
  { y: 1077, name: 'Notification Service', port: 5105, info: ['Email giao dịch · nhắc lịch'], db: 'ticket-notification', data: ['Jobs · templates · preferences'], icon: 'email' },
];
for (const d of domains) {
  card(1480, d.y, 370, d.name, [...d.info, `HTTP :${d.port}`], d.icon, c.orange, 105);
  card(2060, d.y, 302, d.db, d.data, 'db', c.green, 105);
  path([[1415, d.y + 48], [1480, d.y + 48]]);
  path([[1850, d.y + 48], [2060, d.y + 48]], c.green);
}
label(1350, 753, 'Token hợp lệ → checkout', c.orange, 17);
label(1875, 460, 'Đọc / ghi DB sở hữu', c.green, 16);
path([[1665, 777], [1665, 732]]);
label(1682, 757, 'reserve / release', c.blue, 16);
text(2059, 1211, 'Không truy vấn chéo DB giữa service', 16, c.green, 600);
text(2059, 1237, 'Mongo transactions cần replica set', 16, c.muted);

// Waiting room is an application workflow; the website polls via the gateway.
region(990, 851, 365, 333, 'VIRTUAL WAITING ROOM', 'Join → poll → token checkout', c.orange, '#fffbf4', '10 6');
card(1007, 938, 331, 'Waiting Room Service', ['Join / status · :5106', 'FIFO · lease · admission rate'], 'queue', c.orange, 110);
icon(1010, 1080, 'key', c.green, 44);
lines(1070, 1099, ['Cấp token checkout có thời hạn', 'Client gửi lại token qua gateway'], 16, c.ink, 25);
path([[1060, 722], [1060, 851]], c.orange, true);
label(1076, 783, '428 / 403 → join + poll', c.orange, 16);
path([[1285, 851], [1285, 722]], c.orange, true);
label(1299, 819, 'Token', c.orange, 16);
card(1007, 1251, 350, 'Redis / ElastiCache', ['Sorted set FIFO · active leases', 'Rate window · TTL'], 'db', c.pink, 108);
path([[1172, 1184], [1172, 1251]], c.orange);
label(1188, 1232, 'State', c.orange, 16);

// Domain events use a separate bus. The bus denotes selected producers/consumers.
path([[1898, 600], [1898, 1227], [1670, 1227], [1670, 1251]], c.purple, true);
path([[1798, 732], [1798, 755], [1898, 755]], c.purple, true, false);
path([[1798, 882], [1798, 905], [1898, 905]], c.purple, true, false);
path([[1898, 1055], [1798, 1055], [1798, 1032]], c.purple, true);
path([[1898, 1197], [1798, 1197], [1798, 1182]], c.purple, true);
card(1480, 1251, 455, 'Amazon MQ / RabbitMQ', ['Outbox → broker → consumer idempotent', 'Retry có giới hạn · dead-letter queue'], 'queue', c.purple, 108);
label(1490, 1232, 'Domain events · đồng bộ projection / email', c.purple, 16);

card(2425, 627, 320, 'Media storage', ['Cloudinary / S3 fallback', 'Theo cấu hình provider'], 'bucket', c.green, 105);
card(2425, 777, 320, 'VNPay / MoMo', ['Redirect + webhook', 'Idempotent payment update'], 'card', c.purple, 105);
card(2425, 1077, 320, 'SMTP / Amazon SES', ['Giao dịch · nhắc sự kiện', 'Chiến dịch · preferences'], 'email', c.pink, 105);
path([[1850, 711], [2017, 711], [2017, 752], [2403, 752], [2403, 680], [2425, 680]], c.green, true);
path([[1850, 859], [2005, 859], [2005, 902], [2403, 902], [2403, 830], [2425, 830]], c.blue);
label(2120, 923, 'Webhook quay về public API → booking', c.blue, 16);
path([[1850, 1160], [2005, 1160], [2005, 1290], [2403, 1290], [2403, 1130], [2425, 1130]], c.blue);
text(2425, 978, '* Mobile và NFC nằm ngoài phạm vi', 18, c.muted);
text(2425, 1004, 'phạm vi đồ án hiện tại.', 18, c.muted);

// Operational policy is positioned inside the VPC without pretending it is a service hop.
text(695, 748, 'HA & SCALING', 21, c.blue, 750);
lines(695, 782, ['HPA theo CPU/RAM', 'metrics-server', 'Cluster Autoscaler', '', 'System: On-Demand', 'General: Spot pool', 'Booking / check-in:', 'On-Demand critical', '', 'PDB + topology spread', 'NetworkPolicy', 'ServiceAccount riêng'], 18, c.muted, 29);
text(695, 1195, 'SECRETS', 21, c.blue, 750);
lines(695, 1230, ['AWS Secrets Manager', 'K8s runtime Secret', 'Cần nạp/sync khi deploy', 'Không vẽ sync tự động'], 17, c.muted, 27);

// A brief narrative makes the large topology readable for non-operators.
region(55, 738, 560, 657, 'LUỒNG MUA VÉ KHI HOT SALE', '', c.blue, '#fafcfe');
badge(89, 802, '1', 'Đăng nhập, chọn vé', ['Website gọi API qua Cloudflare', 'và gateway để duyệt sự kiện.']);
badge(89, 920, '2', 'Vào hàng chờ', ['Client join rồi poll trạng thái;', 'Redis giữ vị trí và quyền checkout.']);
badge(89, 1038, '3', 'Nhận admission token', ['Gateway kiểm tra token; booking', 'đối chiếu event và chống dùng lại.']);
badge(89, 1156, '4', 'Giữ vé, thanh toán, phát hành', ['Catalog reserve atomic; webhook', 'xác nhận kết quả và phát domain event.']);
box(79, 1258, 512, 109, '#fff6e8', '#edc281');
lines(99, 1287, ['Admission không bảo đảm còn vé.', 'Tồn kho atomic tại catalog quyết định cấp vé.', 'Queue nội bộ booking cũ vẫn tắt.'], 19, '#855211', 29);

region(55, 1440, 2690, 236, 'OBSERVABILITY / QUAN SÁT HỆ THỐNG', 'Các kết nối telemetry dưới đây là luồng logic, không đi qua public gateway.', c.pink, '#fcf8fb');
card(78, 1523, 375, 'Metrics', ['ServiceMonitor → Prometheus', 'Latency · errors · DB · queue'], 'chart', c.pink);
card(525, 1523, 470, 'Distributed tracing', ['OTel SDK → Collector → Tempo', 'Correlation theo request / service'], 'trace', c.pink);
card(1067, 1523, 375, 'Grafana', ['Dashboard theo service', 'Traffic · HPA · outbox'], 'chart', c.orange);
card(1514, 1523, 450, 'Alertmanager', ['Payment errors · backlog', 'Pod restart · HPA max replicas'], 'bell', c.pink);
card(2036, 1523, 685, 'AWS CloudWatch / SNS', ['Metrics và alarms hạ tầng; log groups theo cấu hình', 'Routing cảnh báo / log ingestion cần cấu hình runtime'], 'cloud', c.pink);
path([[453, 1577], [490, 1577], [490, 1653], [1255, 1653], [1255, 1631]], c.pink, true);
path([[995, 1577], [1067, 1577]], c.pink, true);
path([[490, 1653], [1739, 1653], [1739, 1631]], c.pink, true);

region(55, 1710, 2690, 220, 'DELIVERY / INFRASTRUCTURE AS CODE', 'Infra apply theo layer; app build từng service và cập nhật image vào GitOps.', c.blue, '#f7faff');
card(78, 1789, 355, 'GitHub Actions', ['Test · audit · build · scan', 'Image tag: env-short_sha'], 'git', c.ink);
card(490, 1789, 315, 'Amazon ECR', ['Image riêng / service', 'linux/arm64'], 'cube', c.orange);
card(862, 1789, 395, 'Infra Git repository', ['Kustomize dev / staging / prod', 'Image URI + immutable tag'], 'git', c.ink);
card(1314, 1789, 330, 'Argo CD', ['Sync manifest → EKS', 'Rollback qua Git revert'], 'cube', c.orange);
card(1725, 1789, 510, 'Terraform + Helm', ['00 Network → 01 EKS → 02 Data', '03 Storage/Secrets → 04 Observability'], 'cube', c.purple);
card(2292, 1789, 429, 'Remote state S3', ['State theo layer / environment', 'Destroy theo thứ tự ngược'], 'bucket', c.green);
path([[433, 1843], [490, 1843]]);
path([[805, 1843], [862, 1843]]);
path([[1257, 1843], [1314, 1843]]);
path([[2235, 1843], [2292, 1843]]);

path([[65, 1970], [120, 1970]], c.blue);
text(132, 1976, 'HTTP / API', 18, c.muted);
path([[318, 1970], [373, 1970]], c.green);
text(385, 1976, 'DB / static assets', 18, c.muted);
path([[625, 1970], [680, 1970]], c.orange, true);
text(692, 1976, 'Admission / polling', 18, c.muted);
path([[945, 1970], [1000, 1970]], c.purple, true);
text(1012, 1976, 'Domain events', 18, c.muted);
path([[1240, 1970], [1295, 1970]], c.pink, true);
text(1307, 1976, 'Telemetry', 18, c.muted);
text(2745, 1976, 'Icon vector minh họa theo phong cách cloud architecture', 17, c.muted, 400, 'end');
text(55, 2015, 'Phạm vi: kiến trúc cấu hình trong repository. Redis managed là opt-in; image, domain, secrets và kết nối cloud cần được triển khai/kiểm chứng.', 18, c.muted);
add('</g></svg>');

const svg = fragments.join('\n');
writeFileSync(new URL('ticketstage-architecture.svg', out), svg);
console.log('Created ticketstage-architecture.svg');

// Optional standalone renderer, supplied by path to avoid adding app dependencies.
if (process.argv[2]) {
  const require = createRequire(import.meta.url);
  const { Resvg } = require(process.argv[2]);
  for (const [name, width] of [['ticketstage-architecture.png', 4200], ['ticketstage-architecture-preview.png', 1800]]) {
    const image = new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: true } });
    writeFileSync(new URL(name, out), image.render().asPng());
    console.log(`Created ${fileURLToPath(new URL(name, out))}`);
  }
}
