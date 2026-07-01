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

export const bookingStatusLabels = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled'
};

export const passStatusLabels = {
  issued: 'Issued',
  checked_in: 'Checked in',
  cancelled: 'Cancelled',
  voided: 'Voided'
};

export const getLabel = (map, key, fallback = 'Unknown') => map[key] || fallback;
