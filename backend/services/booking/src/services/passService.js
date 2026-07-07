const bwipjs = require('bwip-js');
const QRCode = require('qrcode');
const Booking = require('../models/Booking');
const ApiError = require('../../../../utils/ApiError');
const { buildPassSecrets, buildScanPayload } = require('../../../../utils/passUtils');

const findBookingWithSecrets = async (bookingId) => {
  return Booking.findById(bookingId).select('+passes.scanToken +passes.nfcPayload');
};

const assertBookingAccess = (booking, user) => {
  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (booking.user.toString() !== user.id && user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to access these passes');
  }
};

const findPass = (booking, passId) => {
  const pass = booking.passes.id(passId);

  if (!pass) {
    throw new ApiError(404, 'Pass not found');
  }

  return pass;
};

const getTicketSnapshots = (booking) => {
  return new Map(
    (booking.tickets || []).map((item) => [
      item.ticket?.toString?.() || String(item.ticket),
      item.snapshot || {}
    ])
  );
};

const resolvePassScanToken = (pass) => {
  return pass.scanToken || buildPassSecrets(pass.passCode).scanToken;
};

const resolvePassNfcPayload = (pass) => {
  return pass.nfcPayload || buildPassSecrets(pass.passCode).nfcPayload;
};

const toPublicPass = (pass, options = {}) => {
  const payload = {
    id: pass._id,
    ticket: pass.ticket,
    ticketSnapshot: options.ticketSnapshot || {},
    passCode: pass.passCode,
    barcodeValue: pass.barcodeValue,
    status: pass.status,
    checkedInAt: pass.checkedInAt,
    checkInMethod: pass.checkInMethod,
    checkInGate: pass.checkInGate,
    issuedAt: pass.issuedAt
  };

  if (options.includeScanPayload) {
    payload.qrPayload = buildScanPayload(resolvePassScanToken(pass));
    payload.nfcPayload = resolvePassNfcPayload(pass);
  }

  return payload;
};

const getBookingPasses = async (bookingId, user) => {
  const booking = await findBookingWithSecrets(bookingId);
  assertBookingAccess(booking, user);
  const ticketSnapshots = getTicketSnapshots(booking);

  return {
    bookingId: booking._id,
    bookingNumber: booking.bookingNumber,
    bookingStatus: booking.bookingStatus,
    paymentStatus: booking.paymentStatus,
    passes: booking.passes.map((pass) => toPublicPass(pass, {
      includeScanPayload: true,
      ticketSnapshot: ticketSnapshots.get(pass.ticket?.toString?.() || String(pass.ticket)) || {}
    }))
  };
};

const getPassDetail = async (bookingId, passId, user) => {
  const booking = await findBookingWithSecrets(bookingId);
  assertBookingAccess(booking, user);
  const pass = findPass(booking, passId);
  const ticketSnapshots = getTicketSnapshots(booking);

  return {
    bookingId: booking._id,
    bookingNumber: booking.bookingNumber,
    bookingStatus: booking.bookingStatus,
    paymentStatus: booking.paymentStatus,
    pass: toPublicPass(pass, {
      includeScanPayload: true,
      ticketSnapshot: ticketSnapshots.get(pass.ticket?.toString?.() || String(pass.ticket)) || {}
    })
  };
};

const getPassQrImage = async (bookingId, passId, user) => {
  const booking = await findBookingWithSecrets(bookingId);
  assertBookingAccess(booking, user);
  const pass = findPass(booking, passId);

  return QRCode.toBuffer(buildScanPayload(resolvePassScanToken(pass)), {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 360
  });
};

const getPassBarcodeImage = async (bookingId, passId, user) => {
  const booking = await findBookingWithSecrets(bookingId);
  assertBookingAccess(booking, user);
  const pass = findPass(booking, passId);

  return bwipjs.toBuffer({
    bcid: 'code128',
    text: pass.barcodeValue,
    scale: 3,
    height: 14,
    includetext: true,
    textxalign: 'center',
    paddingwidth: 12,
    paddingheight: 10
  });
};

const getPassNfcPayload = async (bookingId, passId, user) => {
  const booking = await findBookingWithSecrets(bookingId);
  assertBookingAccess(booking, user);
  const pass = findPass(booking, passId);

  return {
    passId: pass._id,
    passCode: pass.passCode,
    nfcPayload: resolvePassNfcPayload(pass),
    contentType: 'text/plain',
    note: 'Mobile app can expose this payload via NFC HCE where the device and operating system allow it.'
  };
};

module.exports = {
  getBookingPasses,
  getPassBarcodeImage,
  getPassDetail,
  getPassNfcPayload,
  getPassQrImage
};
