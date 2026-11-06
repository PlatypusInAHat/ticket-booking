---
name: TicketStage
description: Nền tảng đặt vé sự kiện — mỗi sự kiện là một tấm vé in, mua vé là xé cuống.
colors:
  accent: "oklch(0.82 0.15 78)"
  accent-strong: "oklch(0.76 0.16 70)"
  accent-foreground: "oklch(0.18 0.02 70)"
  foil: "oklch(0.52 0.13 60)"
  paper: "oklch(0.925 0.028 86)"
  paper-2: "oklch(0.885 0.032 84)"
  paper-ink: "oklch(0.2 0.015 60)"
  paper-muted: "oklch(0.45 0.02 65)"
  paper-line: "oklch(0.72 0.03 75)"
  background: "oklch(0.155 0.006 60)"
  surface: "oklch(0.195 0.007 62)"
  surface-2: "oklch(0.235 0.008 64)"
  surface-3: "oklch(0.29 0.009 66)"
  foreground: "oklch(0.96 0.008 85)"
  muted: "oklch(0.7 0.012 75)"
  muted-2: "oklch(0.62 0.012 70)"
  border: "oklch(0.3 0.009 68)"
  border-strong: "oklch(0.42 0.011 70)"
  stamp-red: "oklch(0.5 0.19 27)"
  danger: "oklch(0.68 0.18 25)"
  success: "oklch(0.78 0.14 155)"
  info: "oklch(0.72 0.1 230)"
typography:
  display:
    fontFamily: "Big Shoulders, Be Vietnam Pro, ui-sans-serif, sans-serif"
    fontSize: "clamp(3rem, 8vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.88
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Big Shoulders, Be Vietnam Pro, ui-sans-serif, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "0.01em"
  title:
    fontFamily: "Big Shoulders, Be Vietnam Pro, ui-sans-serif, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "0.01em"
  price:
    fontFamily: "Big Shoulders, Be Vietnam Pro, ui-sans-serif, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "tnum"
  stamp:
    fontFamily: "Big Shoulders, Be Vietnam Pro, ui-sans-serif, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.04em"
  body:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
    fontFeature: "tnum"
  body-sm:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Be Vietnam Pro, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.25
rounded:
  sm: "3px"
  md: "4px"
  lg: "5px"
  card: "6px"
  3xl: "8px"
spacing:
  gutter-sm: "16px"
  gutter-md: "24px"
  gutter-lg: "32px"
  card-pad: "20px"
  grid-gap: "20px"
  section: "64px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.accent-strong}"
  button-secondary:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 20px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-3}"
  button-outline:
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 20px"
  button-ghost:
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 14px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "48px"
    padding: "0 16px"
  ticket-body:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.card}"
    padding: "16px 20px 20px"
  ticket-stub:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.paper-ink}"
    padding: "16px 20px"
  stamp:
    typography: "{typography.stamp}"
    rounded: "{rounded.sm}"
    padding: "2px 6px 1px"
---

# Design System: TicketStage

## Overview

**Creative North Star: "Tấm vé in"**

Mỗi sự kiện là một tấm vé thật. Thân vé (ảnh, tên sự kiện, địa điểm) nằm trên nền tối; qua một đường xé răng cưa là cuống vé bằng giấy bìa màu kem, nơi in ngày, giá và nút mua. Mua vé là xé cuống. Cùng một hình dạng vé đi theo khách từ trang chủ, trang chi tiết, chọn hạng vé cho tới tài khoản, nơi vé giữ mã QR.

Nền là màu gần đen ấm như phòng tối; tấm vé là vật thể duy nhất có chất liệu. Hổ phách là màu mực in duy nhất cho hành động: nút chính, gạch chân điều hướng đang chọn, vùng bôi chọn, viền hạng vé đang chọn. Trên giấy kem, giá được in bằng màu nhũ hổ phách đậm (foil). Chữ tiêu đề là chữ in hoa hẹp Big Shoulders, như chữ in trên vé; phần đọc dùng Be Vietnam Pro. Góc cắt khuôn 3–8px, không có hình viên thuốc, không bóng đổ, không kính mờ: chiều sâu chỉ đến từ việc vé chồng lên mép nền.

Mật độ vừa phải, phục vụ khách xem trên điện thoại ban đêm: một thông tin quan trọng (giá, ngày) luôn đọc được ngay trên cuống vé, không phải đi tìm.

**Key Characteristics:**
- Thân vé tối + cuống vé giấy kem, ngăn bởi đường răng cưa có hai khấc cắt tròn.
- Một màu hành động duy nhất: hổ phách. Giá in bằng foil trên giấy.
- Chữ in hoa hẹp Big Shoulders cho tiêu đề, ngày, giá và trạng thái.
- Trạng thái là chữ đóng dấu trong khung kẻ mảnh, không tô nền.
- Chiều sâu chỉ bằng chồng lấp; không bóng, không kính, không viên thuốc.

## Colors

Một nền gần đen ấm, một chất liệu giấy kem, một màu mực hổ phách.

### Primary
- **Hổ phách in** (accent): màu hành động duy nhất: nút chính, gạch chân 2px dưới mục điều hướng đang chọn, vùng bôi chọn, con trỏ nhập, viền focus, viền và ô đánh dấu của hạng vé đang chọn, ô đếm giỏ hàng, logo vé.
- **Hổ phách đậm** (accent-strong): trạng thái hover của nút chính.
- **Mực trên hổ phách** (accent-foreground): chữ và biểu tượng nằm trên nền hổ phách.
- **Nhũ foil** (foil): giá tiền và tổng tiền in trên cuống giấy; chữ dấu "ALMOST GONE" trên giấy. Chỉ dùng trên nền giấy, không dùng trên nền tối.

### Neutral
- **Phòng tối** (background): nền trang, thanh điều hướng (đặc, không trong suốt), màu đĩa khấc khi vé nằm trên nền trang.
- **Thân vé** (surface): thân vé, dải hero, chân trang, ô nhập liệu, khung đăng nhập.
- **Thân vé nâng** (surface-2 / surface-3): nút phụ và hover của nút phụ; nền ảnh khi đang tải.
- **Chữ in sáng** (foreground) / **Chữ phụ** (muted) / **Chữ mờ** (muted-2): tiêu đề, văn bản đọc, chú thích và placeholder.
- **Đường kẻ** (border) / **Đường kẻ đậm** (border-strong): viền vé, viền ô nhập; viền đậm cho vé nổi bật và hover.
- **Giấy bìa** (paper), **Giấy bìa sẫm** (paper-2), **Mực giấy** (paper-ink), **Mực giấy phụ** (paper-muted), **Kẻ giấy** (paper-line): mọi thứ in trên cuống vé; paper-line cũng là màu đường răng cưa.

### Trạng thái
- **Dấu đỏ** (stamp-red): chữ dấu "SOLD OUT" trên giấy. Đỏ sẫm hơn danger để đủ tương phản trên kem.
- **Nguy hiểm** (danger): lỗi, nút hủy, dấu "SOLD OUT" trên nền tối.
- **Thành công** (success) / **Thông tin** (info): thông báo thành công và trạng thái thông tin trên nền tối.

### Named Rules
**The One Ink Rule.** Hổ phách là màu hành động duy nhất. Không thêm màu nhấn thứ hai; mọi thứ khác là mực, giấy hoặc phòng tối.

**The Foil-on-Paper Rule.** Giá tiền luôn in trên cuống giấy bằng foil. Foil không bao giờ xuất hiện trên nền tối, và giá không đặt trên thân vé.

## Typography

**Display Font:** Big Shoulders (dự phòng Be Vietnam Pro, sans-serif), trục opsz 10–72, độ đậm 600–900
**Body Font:** Be Vietnam Pro (dự phòng ui-sans-serif, system-ui), 400–700

**Character:** Chữ in hoa hẹp, đậm, khít dòng như chữ in trên vé, đặt cạnh một sans-serif mềm có hỗ trợ đầy đủ dấu tiếng Việt cho phần đọc. Toàn bộ trang dùng chữ số đều (tabular) để giá và giờ thẳng cột.

### Hierarchy
- **Display** (800, clamp(3rem, 8vw, 6rem), line-height 0.88, in hoa): tiêu đề hero trang chủ và tiêu đề trang chi tiết sự kiện, hai dòng.
- **Headline** (800, 2.25rem → 3rem từ sm, 0.95, in hoa): tiêu đề khu vực, tiêu đề trang tài khoản và đăng nhập.
- **Title** (800, 1.65–1.875rem, 0.95, in hoa): tên sự kiện trên vé, tên hạng vé, tên danh mục (2.25rem).
- **Price** (800, 1.5–2.25rem, line-height 1, chữ số đều): giá và tổng tiền trên cuống; ngày trên cuống in cỡ 3rem, line-height 0.8.
- **Stamp** (700, 0.8125rem, letter-spacing 0.04em, in hoa): chữ dấu trạng thái và danh mục.
- **Body** (400, 1rem, 1.625): mô tả, tối đa khoảng 36rem (max-w-xl).
- **Body-sm / Label** (400–600, 0.875rem): địa điểm, nhãn biểu mẫu, liên kết điều hướng (500).

### Named Rules
**The Print Caps Rule.** Big Shoulders in hoa chỉ dành cho thứ được "in" lên vé: tiêu đề, tên, ngày, giá, chữ dấu. Câu văn và nhãn biểu mẫu luôn là Be Vietnam Pro, chữ thường.

## Layout

Khung nội dung tối đa 80rem (1280px), lề ngang 16px / 24px (sm) / 32px (lg). Thanh điều hướng cố định cao 64px. Lưới vé sự kiện: 1 cột, 2 cột từ 640px, 3 hoặc 4 cột từ 1024px, khe 20px. Khu vực cách nhau khoảng 64px theo chiều dọc.

Màn đầu trang chủ: tiêu đề hai dòng sát trái, ô tìm kiếm rộng hết khung ngay bên dưới, rồi một tấm vé nổi bật nằm ngang hết khung (ảnh trái, cuống phải rộng 320px), đè lên mép dưới của dải hero. Trên điện thoại vé chuyển sang dọc: thân trên, cuống dưới, đường răng cưa nằm ngang.

Trang chi tiết: cột nội dung linh hoạt + cột cuống tóm tắt 380px dính khi cuộn (top 96px) từ 1024px.

## Elevation & Depth

Không bóng đổ, không kính mờ, không phát sáng. Bề mặt phẳng; tầng lớp được nói bằng màu (background → surface → paper) và đường kẻ. Chiều sâu duy nhất là chồng lấp vật lý: tấm vé nổi bật vắt qua mép dưới dải hero, nên khấc trên của nó nằm trên màu dải và khấc dưới nằm trên màu trang. Lớp phủ chuyển màu chỉ dùng làm nền đọc cho chữ đặt trên ảnh.

### Named Rules
**The Overlap-Only Rule.** Muốn một vật nổi lên thì cho nó chồng lên mép của vật khác. Không dùng box-shadow, backdrop-filter hay quầng sáng.

## Shapes

Góc cắt khuôn, nhỏ và sắc: 3px cho dấu và ô đánh dấu, 4px cho nút và ô nhập, 6px cho vé, tối đa 8px. Không có hình viên thuốc trên nút, nhãn hay chip. Hình tròn chỉ xuất hiện ở hai chỗ có lý do vật lý: hai khấc cắt (đĩa 28px) ở đầu đường răng cưa, và vòng quay tải trang.

Đường răng cưa: nét đứt 2px màu paper-line, lùi vào 20px mỗi đầu, mỗi đầu có một khấc tròn bị mép vé cắt. Đường đứt 2px border-strong cũng là đường viền trên của chân trang.

### Named Rules
**The Notch Matches Ground Rule.** Đĩa khấc phải đúng màu của nền mà vé đang nằm trên đó (mặc định background; surface khi vé nằm trên dải hero hoặc thẻ). Vé vắt qua hai nền thì hai khấc mang hai màu.

## Components

### Buttons
Gọn, phẳng, nhấn xuống 1px khi bấm.
- **Shape:** góc 4px; chữ Be Vietnam Pro 600, 0.875rem (1rem ở cỡ lớn).
- **Cỡ:** sm 36px / md 44px / lg 48px chiều cao.
- **Primary:** nền hổ phách, chữ mực trên hổ phách; hover sang hổ phách đậm. Mỗi vùng chỉ một nút chính (Get tickets, Add to cart, Sign in).
- **Secondary:** nền surface-2, viền border, chữ sáng; hover surface-3. Dùng cho Search.
- **Outline:** chỉ viền border-strong, hover viền sáng. Dùng cho "See all events", "Try again".
- **Ghost:** chữ phụ, hover nền surface-2 và chữ sáng.
- **Danger:** viền danger 50%, chữ danger, hover nền danger 10%.
- **Focus:** viền ngoài 2px hổ phách, cách 2px, trên mọi phần tử tương tác.

### Vé sự kiện (signature)
- **Thân:** surface, viền border (hover border-strong), góc 6px, ảnh tỉ lệ 16:10 (phóng 1.03 khi hover; đen trắng khi hết vé), tên in hoa chuyển hổ phách khi hover, địa điểm muted.
- **Cuống:** giấy kem; trái là khối ngày (số ngày 3rem + tháng / thứ giờ), phải là "From" + giá foil.
- **Vé nổi bật:** viền border-strong, ảnh có lớp phủ đọc chữ, cuống 320px chứa ngày, dấu danh mục kẻ paper-line, địa điểm, giá và nút chính cỡ lớn.

### Hạng vé
Mỗi hạng là một vé có thể chọn (radio). Thân: tên in hoa, mô tả, quyền lợi. Cuống: giá foil, "N left" hoặc dấu SOLD OUT, và khi đang chọn thì bộ chọn số lượng trên nền paper-2. Đang chọn: viền hổ phách và ô đánh dấu hổ phách 20px góc 3px. Hết vé: mờ 55%, không bấm được.

### Dấu trạng thái (Stamp)
Chữ dấu in hoa trong khung kẻ, không tô nền, góc 3px. Trên nền tối: ON SALE bằng chữ sáng, ALMOST GONE bằng hổ phách, SOLD OUT bằng danger. Trên giấy: ALMOST GONE bằng foil, SOLD OUT bằng stamp-red với viền 2px, trên thẻ sự kiện nghiêng -3° như dấu đóng tay.

### Inputs / Fields
- **Style:** cao 48px, nền surface (trên dải hero dùng nền background), viền border, góc 4px, chữ 0.875rem, placeholder muted-2.
- **Focus:** viền đổi sang hổ phách, con trỏ nhập hổ phách; không quầng sáng.
- **Disabled:** mờ 60%. Lỗi hiển thị bằng hộp thông báo viền danger 40%, nền danger 10%.

### Navigation
Thanh đặc màu background cao 64px, viền dưới chỉ hiện khi cuộn. Liên kết 0.875rem 500 màu muted; đang chọn là chữ sáng với gạch chân hổ phách 2px sát đáy thanh. Liên kết có query (danh mục) không bao giờ hiện là đang chọn. Trên điện thoại: menu thả xuống với mục in hoa cỡ 1.875rem, mục đang chọn màu hổ phách. Logo là vé "admit one" hổ phách có khấc và đường đứt, cạnh chữ TicketStage in hoa.

### Khung xác thực
Một vé đơn rộng 448px: thân trên có logo và tiêu đề in hoa, đường răng cưa, phần dưới chứa biểu mẫu.

### Chuyển động
Vé nổi bật hiện lên bằng fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1). Khi thêm vào giỏ, cuống "xé" nhẹ (stub-tear 0.45s: hạ 2px, xoay -1.2°, trở lại). Mọi chuyển động tắt khi người dùng chọn giảm chuyển động.

## Do's and Don'ts

### Do:
- **Do** đặt giá và ngày của mọi sự kiện, hạng vé hay tóm tắt đơn trên cuống giấy kem, ngăn khỏi thân vé bằng đường răng cưa.
- **Do** dùng hổ phách cho đúng một hành động chính mỗi vùng, cộng với trạng thái đang chọn và focus.
- **Do** in giá bằng foil, chữ Big Shoulders 800, chữ số đều.
- **Do** viết trạng thái thành chữ dấu trong khung kẻ (ON SALE, ALMOST GONE, SOLD OUT).
- **Do** đặt màu đĩa khấc đúng màu nền bên dưới vé.
- **Do** giữ góc trong thang 3–8px.

### Don't:
- **Don't** dùng box-shadow, backdrop-filter hay quầng sáng; chiều sâu chỉ bằng chồng lấp.
- **Don't** dùng hình viên thuốc (bo tròn hoàn toàn) cho nút, nhãn hay chip; hình tròn chỉ dành cho khấc cắt và vòng quay tải.
- **Don't** tô nền cho chữ dấu trạng thái hoặc thêm màu nhấn thứ hai ngoài hổ phách.
- **Don't** đặt foil trên nền tối hoặc đặt giá trên thân vé.
- **Don't** dùng Big Shoulders cho câu văn hay nhãn biểu mẫu.
- **Don't** đặt dòng chữ nhỏ in hoa giãn chữ (kicker/eyebrow) phía trên tiêu đề.
