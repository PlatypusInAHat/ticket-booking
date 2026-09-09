const Booking = require('../models/Booking');
const PromoCode = require('../models/PromoCode');
const { ApiError } = require('@ticket-booking/shared');

const normalizeCode = (code = '') => String(code).trim().toUpperCase();

const calculateDiscount = (promo, subtotal) => {
  const rawDiscount = promo.discountType === 'percentage'
    ? subtotal * (promo.value / 100)
    : promo.value;
  const cappedDiscount = promo.maxDiscountAmount > 0
    ? Math.min(rawDiscount, promo.maxDiscountAmount)
    : rawDiscount;
  return Math.max(0, Math.min(subtotal, Math.round(cappedDiscount)));
};

const validatePromoCode = async ({ code, subtotal, eventIds = [], userId }) => {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) {
    return { code: '', discount: 0, grandTotal: subtotal, promo: null };
  }

  const promo = await PromoCode.findOne({ code: normalizedCode, active: true });
  if (!promo) throw new ApiError(400, 'Promotion code is invalid or inactive');

  const now = new Date();
  if (promo.startsAt && promo.startsAt > now) throw new ApiError(400, 'Promotion has not started');
  if (promo.endsAt && promo.endsAt < now) throw new ApiError(400, 'Promotion has expired');
  if (subtotal < promo.minOrderAmount) throw new ApiError(400, `Order must be at least ${promo.minOrderAmount}`);

  const allowedEvents = promo.eventIds.map(id => id.toString());
  if (allowedEvents.length > 0 && eventIds.some(id => !allowedEvents.includes(String(id)))) {
    throw new ApiError(400, 'Promotion does not apply to all selected tickets');
  }

  const paidFilter = {
    'pricing.promoCode': normalizedCode,
    paymentStatus: { $in: ['completed', 'refunded'] }
  };
  const [totalUses, userUses] = await Promise.all([
    promo.usageLimit > 0 ? Booking.countDocuments(paidFilter) : 0,
    userId ? Booking.countDocuments({ ...paidFilter, user: userId }) : 0
  ]);

  if (promo.usageLimit > 0 && totalUses >= promo.usageLimit) throw new ApiError(409, 'Promotion usage limit has been reached');
  if (userId && userUses >= promo.perUserLimit) throw new ApiError(409, 'You have already used this promotion');

  const discount = calculateDiscount(promo, subtotal);
  return {
    code: normalizedCode,
    discount,
    grandTotal: Math.max(0, subtotal - discount),
    promo
  };
};

const createPromoCode = async (data, user) => {
  const code = normalizeCode(data.code);
  if (data.discountType === 'percentage' && Number(data.value) > 100) {
    throw new ApiError(400, 'Percentage discount cannot exceed 100');
  }

  try {
    return await PromoCode.create({ ...data, code, createdBy: user.id });
  } catch (error) {
    if (error.code === 11000) throw new ApiError(409, 'Promotion code already exists');
    throw error;
  }
};

module.exports = { calculateDiscount, createPromoCode, validatePromoCode };
