export const eventTypeLabels = {
  concert: 'Hòa nhạc',
  train: 'Tàu hỏa',
  flight: 'Máy bay',
  movie: 'Phim',
  sports: 'Thể thao',
  theater: 'Sân khấu',
  conference: 'Hội nghị',
  festival: 'Lễ hội',
  workshop: 'Workshop',
  other: 'Khác'
};

export const categoryLabels = {
  standard: 'Tiêu chuẩn',
  premium: 'Cao cấp',
  vip: 'VIP'
};

export const bookingStatusLabels = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  cancelled: 'Đã hủy'
};

export const paymentStatusLabels = {
  pending: 'Chờ thanh toán',
  completed: 'Đã thanh toán',
  failed: 'Thanh toán lỗi',
  refunded: 'Đã hoàn tiền'
};

export const paymentMethodLabels = {
  credit_card: 'Thẻ tín dụng (demo)',
  debit_card: 'Thẻ ghi nợ (demo)',
  bank_transfer: 'Chuyển khoản (demo)',
  vnpay: 'VNPay',
  momo: 'MoMo',
  zalopay: 'ZaloPay',
  paypal: 'PayPal',
  cash: 'Tiền mặt',
  other: 'Khác'
};

export const getLabel = (map, key, fallback = 'Không rõ') => map[key] || fallback;
