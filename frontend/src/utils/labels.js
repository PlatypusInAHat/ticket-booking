export const eventTypeLabels = {
  concert: 'Concert',
  train: 'Train',
  flight: 'Flight',
  movie: 'Movie',
  sports: 'Sports',
  theater: 'Theater',
  conference: 'Conference',
  festival: 'Festival',
  workshop: 'Workshop',
  other: 'Other'
};

export const categoryLabels = {
  standard: 'Standard',
  premium: 'Premium',
  vip: 'VIP'
};

export const bookingStatusLabels = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled'
};

export const paymentStatusLabels = {
  pending: 'Awaiting payment',
  completed: 'Paid',
  failed: 'Payment failed',
  refunded: 'Refunded'
};

export const paymentMethodLabels = {
  credit_card: 'Credit card (demo)',
  debit_card: 'Debit card (demo)',
  bank_transfer: 'Bank transfer (demo)',
  vnpay: 'VNPay',
  momo: 'MoMo',
  zalopay: 'ZaloPay',
  paypal: 'PayPal',
  cash: 'Cash',
  other: 'Other'
};

export const getLabel = (map, key, fallback = 'Unknown') => map[key] || fallback;
