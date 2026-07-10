const { Types } = require('mongoose');
const {
  toTicketSnapshotMap,
  toProjectionPass,
  toCheckInBookingProjection
} = require('../subscribers/checkinSubscribers');

describe('checkin projection mapping', () => {
  test('maps booking event payload to a standalone check-in projection', () => {
    const bookingId = new Types.ObjectId();
    const userId = new Types.ObjectId();
    const ticketId = new Types.ObjectId();
    const passId = new Types.ObjectId();
    const checkedInBy = new Types.ObjectId();
    const startsAt = new Date('2026-08-18T19:30:00.000Z');
    const createdAt = new Date('2026-07-10T08:00:00.000Z');
    const updatedAt = new Date('2026-07-10T09:00:00.000Z');

    const bookingPayload = {
      _id: bookingId,
      bookingNumber: 'BK-2026-0001',
      user: userId,
      bookingStatus: 'confirmed',
      paymentStatus: 'completed',
      customerInfo: {
        name: 'Alex Nguyen',
        email: 'alex@example.com',
        phone: '0909009009',
        address: 'District 1'
      },
      tickets: [
        {
          ticket: ticketId,
          snapshot: {
            ticketName: 'VIP',
            eventName: 'Summer Concert',
            eventType: 'concert',
            location: {
              venue: 'Main Arena',
              city: 'Ho Chi Minh City'
            },
            date: startsAt,
            time: '19:30',
            currency: 'VND'
          }
        }
      ],
      passes: [
        {
          _id: passId,
          ticket: ticketId,
          passCode: 'TB-ABC-123',
          barcodeValue: 'TB-ABC-123',
          scanTokenHash: 'scan-hash',
          nfcPayloadHash: 'nfc-hash',
          status: 'checked_in',
          holder: {
            name: 'Alex Nguyen',
            email: 'alex@example.com',
            phone: '0909009009'
          },
          seat: {
            section: 'VIP',
            row: 'A',
            number: '12',
            code: 'VIP-A12'
          },
          checkInMethod: 'qr',
          checkInGate: 'North Gate',
          checkInDevice: 'device-01',
          checkedInAt: updatedAt,
          checkedInBy,
          lastScannedAt: updatedAt,
          scanCount: 1
        }
      ],
      confirmedAt: updatedAt,
      expiresAt: startsAt,
      createdAt,
      updatedAt
    };

    const projection = toCheckInBookingProjection(bookingPayload);

    expect(projection).toMatchObject({
      _id: bookingId,
      bookingNumber: 'BK-2026-0001',
      user: userId,
      bookingStatus: 'confirmed',
      paymentStatus: 'completed',
      customerInfo: {
        name: 'Alex Nguyen',
        email: 'alex@example.com',
        phone: '0909009009',
        address: 'District 1'
      },
      confirmedAt: updatedAt,
      expiresAt: startsAt,
      sourceUpdatedAt: updatedAt,
      createdAt,
      updatedAt
    });

    expect(projection.passes).toHaveLength(1);
    expect(projection.passes[0]).toMatchObject({
      _id: passId,
      ticket: ticketId,
      passCode: 'TB-ABC-123',
      barcodeValue: 'TB-ABC-123',
      scanTokenHash: 'scan-hash',
      nfcPayloadHash: 'nfc-hash',
      status: 'checked_in',
      checkInMethod: 'qr',
      checkInGate: 'North Gate',
      checkInDevice: 'device-01',
      checkedInAt: updatedAt,
      checkedInBy,
      lastScannedAt: updatedAt,
      scanCount: 1,
      ticketSnapshot: {
        ticketName: 'VIP',
        eventName: 'Summer Concert',
        eventType: 'concert',
        location: {
          venue: 'Main Arena',
          city: 'Ho Chi Minh City'
        },
        date: startsAt,
        time: '19:30',
        currency: 'VND'
      }
    });

    expect(projection.projectedAt).toBeInstanceOf(Date);
  });

  test('falls back to safe defaults when booking payload is sparse', () => {
    const ticketId = new Types.ObjectId();
    const passId = new Types.ObjectId();
    const ticketSnapshotMap = toTicketSnapshotMap([]);

    expect(ticketSnapshotMap.size).toBe(0);

    const projectionPass = toProjectionPass({
      _id: passId,
      ticket: ticketId
    }, ticketSnapshotMap);

    expect(projectionPass).toMatchObject({
      _id: passId,
      ticket: ticketId,
      passCode: '',
      barcodeValue: '',
      scanTokenHash: '',
      nfcPayloadHash: '',
      status: 'issued',
      holder: {
        name: '',
        email: '',
        phone: ''
      },
      seat: {
        section: '',
        row: '',
        number: '',
        code: ''
      },
      ticketSnapshot: {}
    });
  });
});
