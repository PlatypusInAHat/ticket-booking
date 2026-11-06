// Compact formats for tables and history lists; prices share the single VND formatter in lib/utils.
export { formatCurrency } from '@/lib/utils';

export const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
