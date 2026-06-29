const axios = require('axios');
const mongoose = require('mongoose');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const ApiError = require('../utils/ApiError');
const catalogClient = require('./catalogClient');
const { publishDomainEvent } = require('../shared/domainEventPublisher');
const EVENTS = require('../shared/domainEvents');
const {
  expirePendingBooking,
  isExpiredPendingBooking,
  serializeBookingForEvent
} = require('./bookingService');
const { hashSecret } = require('../utils/cryptoUtils');

const SUPPORTED_PROVIDERS = ['mock', 'stripe', 'vnpay', 'momo'];
const ZERO_DECIMAL_CURRENCIES = new Set(['VND', 'JPY', 'KRW']);

let stripeClient;

const isConfigured = (value) => {
  return Boolean(value && !/placeholder|change_this|your_/i.test(value));
};

const getStripe = () => {
  if (!isConfigured(process.env.STRIPE_SECRET_KEY)) {
    throw new ApiError(503, 'Stripe is not configured');
  }

  if (!stripeClient) {
    // eslint-disable-next-line global-require
    stripeClient = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
};

const getPublicApiUrl = () => {
  return process.env.PUBLIC_API_URL ||
    process.env.API_PUBLIC_URL ||
    `http://localhost:${process.env.GATEWAY_PORT || process.env.PORT || 5000}`;
};

const getFrontendUrl = () => {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
};

const normalizeProvider = (providerOrMethod = '') => {
  const value = providerOrMethod.toLowerCase();

  if (['credit_card', 'debit_card', 'card'].includes(value)) {
    return 'stripe';
  }

  if (SUPPORTED_PROVIDERS.includes(value)) {
    return value;
  }

  return 'mock';
};

const toMinorAmount = (amount, currency = 'VND') => {
  const normalizedCurrency = currency.toUpperCase();
  const multiplier = ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency) ? 1 : 100;
  return Math.round(Number(amount) * multiplier);
};

const toVnpayAmount = (amount) => {
  return Math.round(Number(amount) * 100);
};

const hmac = (algorithm, data, secret) => {
  return crypto.createHmac(algorithm, secret).update(data, 'utf8').digest('hex');
};

const safeCompare = (left = '', right = '') => {
  const leftBuffer = Buffer.from(String(left), 'utf8');
  const rightBuffer = Buffer.from(String(right), 'utf8');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const encodeQueryValue = (value) => {
  return encodeURIComponent(String(value)).replace(/%20/g, '+');
};

const sortObject = (object = {}) => {
  return Object.keys(object)
    .sort()
    .reduce((result, key) => {
      if (object[key] !== undefined && object[key] !== null && object[key] !== '') {
        result[key] = object[key];
      }
      return result;
    }, {});
};

const buildQueryString = (params = {}) => {
  return Object.entries(sortObject(params))
    .map(([key, value]) => `${encodeQueryValue(key)}=${encodeQueryValue(value)}`)
    .join('&');
};

const formatVnpayDate = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, '0');

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('') + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('');
};

const getRequestIp = (request = {}) => {
  const forwardedFor = request.headers?.['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return request.ip || request.connection?.remoteAddress || '127.0.0.1';
};

const buildPaymentReferenceQuery = ({ provider, objectId, providerOrderId, providerReference }) => {
  const or = [];

  if (objectId && mongoose.Types.ObjectId.isValid(objectId)) {
    or.push({ _id: objectId });
  }

  if (providerOrderId) {
    or.push({ providerOrderId: String(providerOrderId) });
  }

  if (providerReference) {
    or.push({ providerReference: String(providerReference) });
  }

  return {
    provider,
    ...(or.length > 0 ? { $or: or } : { _id: null })
  };
};

const ensurePayableBooking = async (bookingId, user) => {
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (user && booking.user.toString() !== user.id && user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized');
  }

  if (isExpiredPendingBooking(booking)) {
    await expirePendingBooking(booking._id, {
      reason: 'Payment attempted after booking hold expired'
    });
    throw new ApiError(409, 'Booking hold expired. Please create a new booking.');
  }

  if (booking.bookingStatus === 'cancelled') {
    throw new ApiError(400, 'Cancelled bookings cannot be paid');
  }

  if (booking.paymentStatus === 'completed') {
    throw new ApiError(400, 'Payment has already been completed');
  }

  return booking;
};

const createGatewayPayment = async (booking, provider) => {
  const existingPayment = await Payment.findOne({
    booking: booking._id,
    provider,
    status: { $in: ['pending', 'processing'] }
  })
    .sort({ createdAt: -1 })
    .select('+clientSecret +gatewayResponse');

  if (existingPayment) {
    if (!existingPayment.providerOrderId) {
      existingPayment.providerOrderId = existingPayment._id.toString();
      await existingPayment.save();
    }

    return existingPayment;
  }

  const payment = await Payment.create({
    booking: booking._id,
    user: booking.user,
    provider,
    method: booking.paymentMethod,
    amount: booking.totalAmount,
    currency: booking.currency || 'VND',
    status: 'pending',
    idempotencyKey: `${provider}:${booking._id}:${crypto.randomUUID()}`,
    expiresAt: booking.expiresAt,
    metadata: {
      bookingNumber: booking.bookingNumber
    }
  });

  payment.providerOrderId = payment._id.toString();
  await payment.save();
  return payment;
};

const publishPaymentCompleted = async ({ booking, payment, transactionId }, options = {}) => {
  const eventPayload = {
    booking: serializeBookingForEvent(booking),
    bookingId: booking._id.toString(),
    userId: booking.user.toString(),
    payment: {
      id: payment._id.toString(),
      provider: payment.provider,
      method: payment.method,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      transactionId,
      providerReference: payment.providerReference,
      processedAt: payment.processedAt
    }
  };

  const published = await publishDomainEvent(EVENTS.PAYMENT_COMPLETED, eventPayload, {
    source: 'booking-service',
    session: options.session
  });

  if (!published) {
    await catalogClient.applyRevenue(booking.tickets);
  }
};

const completeBookingPayment = async ({
  bookingId,
  userId,
  paymentId,
  provider,
  method,
  amount,
  currency,
  transactionId,
  providerReference = '',
  paymentToken = '',
  gatewayResponse = {},
  metadata = {}
}) => {
  const processedAt = new Date();
  const existingBooking = await Booking.findById(bookingId);

  if (!existingBooking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (isExpiredPendingBooking(existingBooking, processedAt)) {
    await expirePendingBooking(existingBooking._id, {
      now: processedAt,
      reason: 'Payment completed after booking hold expired'
    });
    throw new ApiError(409, 'Booking hold expired. Please create a new booking.');
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const booking = await Booking.findOneAndUpdate(
      {
        _id: bookingId,
        ...(userId ? { user: userId } : {}),
        bookingStatus: 'pending',
        paymentStatus: 'pending',
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: processedAt } }
        ]
      },
      {
        $set: {
          paymentStatus: 'completed',
          transactionId,
          bookingStatus: 'confirmed',
          confirmedAt: processedAt,
          updatedAt: processedAt
        },
        $unset: {
          expiresAt: ''
        },
        $push: {
          statusHistory: {
            bookingStatus: 'confirmed',
            paymentStatus: 'completed',
            changedBy: userId,
            reason: `Payment completed by ${provider}`,
            changedAt: processedAt
          }
        }
      },
      { new: true, session }
    );

    if (!booking) {
      await session.abortTransaction();
      session.endSession();
      const latestBooking = await Booking.findById(bookingId);

      if (latestBooking?.paymentStatus === 'completed') {
        return {
          booking: latestBooking,
          payment: paymentId ? await Payment.findById(paymentId) : null,
          alreadyProcessed: true
        };
      }

      throw new ApiError(409, 'Booking is no longer payable');
    }

    let payment = null;

    if (paymentId) {
      payment = await Payment.findById(paymentId).select('+clientSecret').session(session);
    }

    if (!payment && providerReference) {
      payment = await Payment.findOne({ provider, providerReference }).select('+clientSecret').session(session);
    }

    if (!payment) {
      payment = new Payment({
        booking: booking._id,
        user: booking.user,
        provider,
        method: method || booking.paymentMethod,
        amount: amount ?? booking.totalAmount,
        currency: currency || booking.currency || 'VND'
      });
    }

    payment.provider = provider;
    payment.method = method || payment.method || booking.paymentMethod;
    payment.amount = amount ?? payment.amount ?? booking.totalAmount;
    payment.currency = currency || payment.currency || booking.currency || 'VND';
    payment.status = 'completed';
    payment.transactionId = transactionId || payment.transactionId || providerReference || `TXN_${crypto.randomUUID()}`;
    payment.providerReference = providerReference || payment.providerReference;
    payment.paymentTokenHash = paymentToken ? hashSecret(paymentToken, 'payment-token') : payment.paymentTokenHash;
    payment.gatewayResponse = gatewayResponse;
    payment.processedAt = processedAt;
    payment.metadata = {
      ...(payment.metadata || {}),
      ...metadata
    };

    await payment.save({ session });
    await Booking.updateOne(
      { _id: booking._id },
      { $addToSet: { payments: payment._id } },
      { session }
    );

    await publishPaymentCompleted({
      booking,
      payment,
      transactionId: payment.transactionId
    }, { session });

    await session.commitTransaction();
    return {
      booking,
      payment,
      transactionId: payment.transactionId,
      alreadyProcessed: false
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const markPaymentFailed = async (payment, reason, gatewayResponse = {}) => {
  if (!payment) {
    return null;
  }

  payment.status = 'failed';
  payment.failureReason = reason || 'Payment failed';
  payment.gatewayResponse = gatewayResponse;
  await payment.save();
  return payment;
};

const createStripePaymentSession = async (booking, payment) => {
  if (payment.providerReference && payment.clientSecret) {
    return {
      provider: 'stripe',
      paymentId: payment._id,
      paymentIntentId: payment.providerReference,
      clientSecret: payment.clientSecret,
      publishableKey: process.env.STRIPE_PUBLIC_KEY || '',
      status: payment.status
    };
  }

  const stripe = getStripe();
  const intent = await stripe.paymentIntents.create({
    amount: toMinorAmount(booking.totalAmount, booking.currency),
    currency: (booking.currency || 'VND').toLowerCase(),
    description: `Ticket booking ${booking.bookingNumber}`,
    metadata: {
      bookingId: booking._id.toString(),
      bookingNumber: booking.bookingNumber,
      paymentId: payment._id.toString(),
      userId: booking.user.toString()
    },
    automatic_payment_methods: {
      enabled: true
    }
  }, {
    idempotencyKey: payment.idempotencyKey
  });

  payment.status = intent.status === 'succeeded' ? 'completed' : 'processing';
  payment.providerReference = intent.id;
  payment.clientSecret = intent.client_secret;
  payment.gatewayResponse = {
    id: intent.id,
    status: intent.status,
    amount: intent.amount,
    currency: intent.currency
  };
  await payment.save();

  return {
    provider: 'stripe',
    paymentId: payment._id,
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret,
    publishableKey: process.env.STRIPE_PUBLIC_KEY || '',
    status: intent.status
  };
};

const createVnpayPaymentSession = async (booking, payment, request = {}) => {
  if (payment.checkoutUrl) {
    return {
      provider: 'vnpay',
      paymentId: payment._id,
      paymentUrl: payment.checkoutUrl,
      redirectUrl: payment.checkoutUrl,
      status: payment.status
    };
  }

  if (!isConfigured(process.env.VNPAY_TMN_CODE) || !isConfigured(process.env.VNPAY_HASH_SECRET)) {
    throw new ApiError(503, 'VNPay is not configured');
  }

  const paymentUrl = process.env.VNPAY_PAYMENT_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  const returnUrl = process.env.VNPAY_RETURN_URL || `${getPublicApiUrl()}/api/payment/return/vnpay`;
  const createDate = new Date();
  const expireDate = booking.expiresAt || new Date(createDate.getTime() + 15 * 60 * 1000);
  const params = {
    vnp_Version: process.env.VNPAY_VERSION || '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: process.env.VNPAY_TMN_CODE,
    vnp_Amount: toVnpayAmount(booking.totalAmount),
    vnp_CurrCode: 'VND',
    vnp_TxnRef: payment.providerOrderId || payment._id.toString(),
    vnp_OrderInfo: `Thanh toan don ve ${booking.bookingNumber}`,
    vnp_OrderType: 'other',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: getRequestIp(request),
    vnp_CreateDate: formatVnpayDate(createDate),
    vnp_ExpireDate: formatVnpayDate(expireDate)
  };

  const secureHash = hmac('sha512', buildQueryString(params), process.env.VNPAY_HASH_SECRET);
  const redirectUrl = `${paymentUrl}?${buildQueryString({
    ...params,
    vnp_SecureHash: secureHash
  })}`;

  payment.status = 'processing';
  payment.checkoutUrl = redirectUrl;
  payment.providerOrderId = params.vnp_TxnRef;
  payment.gatewayRequest = params;
  await payment.save();

  return {
    provider: 'vnpay',
    paymentId: payment._id,
    paymentUrl: redirectUrl,
    redirectUrl,
    status: payment.status
  };
};

const buildMomoSignature = (payload) => {
  const orderedKeys = [
    'accessKey',
    'amount',
    'extraData',
    'ipnUrl',
    'orderId',
    'orderInfo',
    'partnerCode',
    'redirectUrl',
    'requestId',
    'requestType'
  ];
  const rawSignature = orderedKeys
    .filter((key) => payload[key] !== undefined)
    .map((key) => `${key}=${payload[key]}`)
    .join('&');

  return hmac('sha256', rawSignature, process.env.MOMO_SECRET_KEY);
};

const createMomoPaymentSession = async (booking, payment) => {
  if (payment.checkoutUrl) {
    return {
      provider: 'momo',
      paymentId: payment._id,
      paymentUrl: payment.checkoutUrl,
      deeplink: payment.gatewayResponse?.deeplink || '',
      qrCodeUrl: payment.gatewayResponse?.qrCodeUrl || '',
      status: payment.status,
      gatewayResponse: payment.gatewayResponse || {}
    };
  }

  const required = [
    process.env.MOMO_PARTNER_CODE,
    process.env.MOMO_ACCESS_KEY,
    process.env.MOMO_SECRET_KEY
  ];

  if (!required.every(isConfigured)) {
    throw new ApiError(503, 'MoMo is not configured');
  }

  const endpoint = process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create';
  const requestId = payment.providerOrderId || payment._id.toString();
  const orderId = payment.providerOrderId || payment._id.toString();
  const extraData = Buffer.from(JSON.stringify({
    bookingId: booking._id.toString(),
    paymentId: payment._id.toString(),
    userId: booking.user.toString()
  })).toString('base64');
  const payload = {
    partnerCode: process.env.MOMO_PARTNER_CODE,
    partnerName: process.env.MOMO_PARTNER_NAME || 'Ticket Booking',
    storeId: process.env.MOMO_STORE_ID || 'ticket-booking',
    requestId,
    amount: Math.round(booking.totalAmount),
    orderId,
    orderInfo: `Thanh toan don ve ${booking.bookingNumber}`,
    redirectUrl: process.env.MOMO_REDIRECT_URL || `${getFrontendUrl()}/payment/result`,
    ipnUrl: process.env.MOMO_IPN_URL || `${getPublicApiUrl()}/api/payment/webhooks/momo`,
    requestType: process.env.MOMO_REQUEST_TYPE || 'captureWallet',
    extraData,
    lang: 'vi',
    accessKey: process.env.MOMO_ACCESS_KEY
  };

  payload.signature = buildMomoSignature(payload);
  delete payload.accessKey;

  const response = await axios.post(endpoint, payload, {
    timeout: Number(process.env.MOMO_TIMEOUT_MS || 30000),
    headers: {
      'Content-Type': 'application/json'
    }
  });

  payment.status = 'processing';
  payment.providerOrderId = orderId;
  payment.providerReference = response.data?.requestId || orderId;
  payment.checkoutUrl = response.data?.payUrl || response.data?.deeplink || '';
  payment.gatewayRequest = {
    ...payload,
    signature: '[redacted]'
  };
  payment.gatewayResponse = response.data;
  await payment.save();

  return {
    provider: 'momo',
    paymentId: payment._id,
    paymentUrl: response.data?.payUrl || '',
    deeplink: response.data?.deeplink || '',
    qrCodeUrl: response.data?.qrCodeUrl || '',
    status: payment.status,
    gatewayResponse: response.data
  };
};

const createPaymentSession = async (bookingId, providerOrMethod, user, request = {}) => {
  const booking = await ensurePayableBooking(bookingId, user);
  const provider = normalizeProvider(providerOrMethod || booking.paymentMethod);

  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throw new ApiError(400, 'Unsupported payment provider');
  }

  const payment = await createGatewayPayment(booking, provider);

  if (provider === 'stripe') {
    return createStripePaymentSession(booking, payment);
  }

  if (provider === 'vnpay') {
    return createVnpayPaymentSession(booking, payment, request);
  }

  if (provider === 'momo') {
    return createMomoPaymentSession(booking, payment);
  }

  return {
    provider: 'mock',
    paymentId: payment._id,
    status: payment.status,
    message: 'Use /api/payment/process with a paymentToken to complete mock payment.'
  };
};

const processPayment = async (bookingId, paymentToken, user) => {
  const booking = await ensurePayableBooking(bookingId, user);

  if (!paymentToken) {
    throw new ApiError(400, 'Payment token is required');
  }

  const transactionId = `TXN_${crypto.randomUUID()}`;
  const result = await completeBookingPayment({
    bookingId: booking._id,
    userId: user.id,
    provider: 'mock',
    method: booking.paymentMethod,
    amount: booking.totalAmount,
    currency: booking.currency || 'VND',
    transactionId,
    providerReference: transactionId,
    paymentToken,
    metadata: {
      source: 'paymentService.processPayment'
    }
  });

  return {
    transactionId: result.transactionId,
    payment: {
      id: result.payment?._id,
      provider: result.payment?.provider || 'mock',
      method: result.payment?.method || booking.paymentMethod,
      amount: result.payment?.amount || booking.totalAmount,
      currency: result.payment?.currency || booking.currency || 'VND',
      status: result.payment?.status || 'completed',
      processedAt: result.payment?.processedAt
    },
    booking: result.booking
  };
};

const getPaymentStatus = async (bookingId, user) => {
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (booking.user.toString() !== user.id && user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized');
  }

  const payments = await Payment.find({ booking: booking._id })
    .sort({ createdAt: -1 });

  return {
    paymentStatus: booking.paymentStatus,
    transactionId: booking.transactionId,
    expiresAt: booking.expiresAt,
    payments: payments.map(payment => ({
      id: payment._id,
      provider: payment.provider,
      method: payment.method,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      transactionId: payment.transactionId,
      providerReference: payment.providerReference,
      checkoutUrl: payment.checkoutUrl,
      processedAt: payment.processedAt,
      createdAt: payment.createdAt
    }))
  };
};

const handleStripeWebhook = async ({ rawBody, signature }) => {
  if (!isConfigured(process.env.STRIPE_WEBHOOK_SECRET)) {
    throw new ApiError(503, 'Stripe webhook secret is not configured');
  }

  const stripe = getStripe();
  const event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const payment = await Payment.findOne({
      provider: 'stripe',
      providerReference: intent.id
    });

    if (!payment) {
      return { received: true, ignored: true, reason: 'payment_not_found' };
    }

    await completeBookingPayment({
      bookingId: intent.metadata?.bookingId || payment.booking,
      userId: intent.metadata?.userId || payment.user,
      paymentId: payment._id,
      provider: 'stripe',
      method: payment.method,
      amount: payment.amount,
      currency: payment.currency,
      transactionId: intent.id,
      providerReference: intent.id,
      gatewayResponse: intent,
      metadata: {
        stripeEventId: event.id
      }
    });
  }

  if (event.type === 'payment_intent.payment_failed' || event.type === 'payment_intent.canceled') {
    const intent = event.data.object;
    const payment = await Payment.findOne({
      provider: 'stripe',
      providerReference: intent.id
    });

    await markPaymentFailed(payment, intent.last_payment_error?.message || event.type, intent);
  }

  return {
    received: true,
    type: event.type
  };
};

const verifyMomoSignature = (payload = {}) => {
  if (!isConfigured(process.env.MOMO_ACCESS_KEY) || !isConfigured(process.env.MOMO_SECRET_KEY)) {
    throw new ApiError(503, 'MoMo webhook secret is not configured');
  }

  const signature = payload.signature || '';
  const strictOrder = [
    'accessKey',
    'amount',
    'extraData',
    'message',
    'orderId',
    'orderInfo',
    'orderType',
    'partnerCode',
    'payType',
    'requestId',
    'responseTime',
    'resultCode',
    'transId'
  ];
  const strictPayload = {
    ...payload,
    accessKey: process.env.MOMO_ACCESS_KEY
  };
  const strictRaw = strictOrder
    .filter((key) => strictPayload[key] !== undefined)
    .map((key) => `${key}=${strictPayload[key]}`)
    .join('&');
  const sortedRaw = Object.keys(strictPayload)
    .filter((key) => key !== 'signature' && strictPayload[key] !== undefined)
    .sort()
    .map((key) => `${key}=${strictPayload[key]}`)
    .join('&');

  return safeCompare(signature, hmac('sha256', strictRaw, process.env.MOMO_SECRET_KEY)) ||
    safeCompare(signature, hmac('sha256', sortedRaw, process.env.MOMO_SECRET_KEY));
};

const handleMomoWebhook = async (payload = {}) => {
  if (!verifyMomoSignature(payload)) {
    throw new ApiError(400, 'Invalid MoMo signature');
  }

  const payment = await Payment.findOne(buildPaymentReferenceQuery({
    provider: 'momo',
    objectId: payload.orderId,
    providerOrderId: payload.orderId,
    providerReference: payload.requestId
  }));

  if (!payment) {
    return { received: true, ignored: true, reason: 'payment_not_found' };
  }

  const resultCode = Number(payload.resultCode);

  if (resultCode === 0) {
    await completeBookingPayment({
      bookingId: payment.booking,
      userId: payment.user,
      paymentId: payment._id,
      provider: 'momo',
      method: payment.method,
      amount: payment.amount,
      currency: payment.currency,
      transactionId: String(payload.transId || payload.requestId || payload.orderId),
      providerReference: String(payload.transId || payload.requestId || payload.orderId),
      gatewayResponse: payload,
      metadata: {
        momoResultCode: resultCode
      }
    });
  } else if (resultCode === 9000) {
    payment.status = 'processing';
    payment.gatewayResponse = payload;
    await payment.save();
  } else {
    await markPaymentFailed(payment, payload.message || 'MoMo payment failed', payload);
  }

  return {
    received: true,
    resultCode
  };
};

const verifyVnpaySignature = (payload = {}) => {
  if (!isConfigured(process.env.VNPAY_HASH_SECRET)) {
    throw new ApiError(503, 'VNPay hash secret is not configured');
  }

  const receivedHash = payload.vnp_SecureHash || '';
  const signedPayload = { ...payload };
  delete signedPayload.vnp_SecureHash;
  delete signedPayload.vnp_SecureHashType;

  const expectedHash = hmac('sha512', buildQueryString(signedPayload), process.env.VNPAY_HASH_SECRET);
  return safeCompare(receivedHash.toLowerCase(), expectedHash.toLowerCase());
};

const handleVnpayResult = async (payload = {}) => {
  if (!verifyVnpaySignature(payload)) {
    return {
      RspCode: '97',
      Message: 'Invalid checksum'
    };
  }

  const payment = await Payment.findOne(buildPaymentReferenceQuery({
    provider: 'vnpay',
    objectId: payload.vnp_TxnRef,
    providerOrderId: payload.vnp_TxnRef
  }));

  if (!payment) {
    return {
      RspCode: '01',
      Message: 'Order not found'
    };
  }

  if (Number(payload.vnp_Amount) !== toVnpayAmount(payment.amount)) {
    return {
      RspCode: '04',
      Message: 'Invalid amount'
    };
  }

  const isSuccess = payload.vnp_ResponseCode === '00' && payload.vnp_TransactionStatus === '00';

  if (isSuccess) {
    await completeBookingPayment({
      bookingId: payment.booking,
      userId: payment.user,
      paymentId: payment._id,
      provider: 'vnpay',
      method: payment.method,
      amount: payment.amount,
      currency: payment.currency,
      transactionId: payload.vnp_TransactionNo || payload.vnp_BankTranNo || payload.vnp_TxnRef,
      providerReference: payload.vnp_TransactionNo || payload.vnp_TxnRef,
      gatewayResponse: payload,
      metadata: {
        vnpBankCode: payload.vnp_BankCode || '',
        vnpPayDate: payload.vnp_PayDate || ''
      }
    });
  } else {
    await markPaymentFailed(payment, `VNPay failed with response ${payload.vnp_ResponseCode}`, payload);
  }

  return {
    RspCode: '00',
    Message: 'Confirm Success',
    success: isSuccess
  };
};

module.exports = {
  completeBookingPayment,
  createPaymentSession,
  getPaymentStatus,
  handleMomoWebhook,
  handleStripeWebhook,
  handleVnpayResult,
  processPayment
};
