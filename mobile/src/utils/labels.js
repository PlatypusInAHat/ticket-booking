export const eventTypeLabels = {
  concert: 'Hòa nhạc',
  train: 'Tàu hỏa',
  flight: 'Máy bay',
  movie: 'Phim',
  sports: 'Thể thao',
  theater: 'Sân khấu',
  other: 'Khác'
};

export const bookingStatusLabels = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  cancelled: 'Đã hủy'
};

export const passStatusLabels = {
  issued: 'Có hiệu lực',
  checked_in: 'Đã check-in',
  cancelled: 'Đã hủy',
  voided: 'Vô hiệu hóa'
};

export const getLabel = (map, key, fallback = 'Không rõ') => map[key] || fallback;
