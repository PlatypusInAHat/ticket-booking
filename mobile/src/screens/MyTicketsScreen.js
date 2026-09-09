import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { QrCode, XCircle, CreditCard, RefreshCw } from 'lucide-react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import Screen from '../components/Screen';
import Field from '../components/Field';
import { colors, radius } from '../theme';
import { formatCurrency, formatDate } from '../utils/format';
import { bookingStatusLabels, getLabel } from '../utils/labels';

function BookingCard({ booking, onOpenPasses, onCancel, onRequestRefund }) {
  const [showRefund, setShowRefund] = React.useState(false);
  const [refundReason, setRefundReason] = React.useState('');
  return (
    <Card style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.title}>{booking.bookingNumber}</Text>
        <Text style={styles.badge}>{getLabel(bookingStatusLabels, booking.bookingStatus)}</Text>
      </View>
      <Text style={styles.muted}>Booked on: {formatDate(booking.createdAt)}</Text>
      <Text style={styles.price}>{formatCurrency(booking.totalAmount)}</Text>

      {booking.tickets?.map(item => (
        <View key={`${booking._id}-${item.ticket?._id || item._id}`} style={styles.bookingItem}>
          <Text style={styles.itemTitle}>{item.snapshot?.eventName || item.snapshot?.ticketName || 'Ticket no longer available'}</Text>
          <Text style={styles.muted}>Quantity: {item.quantity}</Text>
        </View>
      ))}

      <View style={styles.actions}>
        <Button title="Mobile passes" icon={QrCode} onPress={() => onOpenPasses(booking)} style={styles.flexButton} />
        {booking.paymentStatus === 'pending' && booking.bookingStatus !== 'cancelled' ? (
          <Button title="Cancel" icon={XCircle} variant="danger" onPress={() => onCancel(booking)} style={styles.flexButton} />
        ) : null}
        {booking.paymentStatus === 'completed' && booking.bookingStatus === 'confirmed' && !['requested', 'processing', 'processed'].includes(booking.refund?.status) ? (
          <Button title="Refund" icon={RefreshCw} variant="secondary" onPress={() => setShowRefund(value => !value)} style={styles.flexButton} />
        ) : null}
      </View>
      {showRefund ? (
        <View style={styles.refundBox}>
          <Field label="Refund reason" value={refundReason} onChangeText={setRefundReason} multiline />
          <Button
            title="Submit refund request"
            icon={RefreshCw}
            onPress={() => onRequestRefund(booking, refundReason).then(() => {
              setShowRefund(false);
              setRefundReason('');
            })}
          />
        </View>
      ) : null}
      {booking.refund?.status && booking.refund.status !== 'none' ? (
        <Text style={styles.muted}>Refund status: {booking.refund.status}</Text>
      ) : null}
    </Card>
  );
}

export default function MyTicketsScreen({ bookings, loading, refresh, onOpenPasses, onCancelBooking, onRequestRefund }) {
  const bookingList = Array.isArray(bookings) ? bookings : [];

  return (
    <Screen title="My Tickets" subtitle="View bookings, QR codes, barcodes, and NFC payloads.">
      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.accent} />}
        scrollEnabled={false}
      >
        {bookingList.map(booking => (
          <BookingCard
            key={booking._id}
            booking={booking}
            onOpenPasses={onOpenPasses}
            onCancel={onCancelBooking}
            onRequestRefund={onRequestRefund}
          />
        ))}
        {!loading && bookingList.length === 0 ? (
          <Card style={styles.emptyCard}>
            <CreditCard size={48} color={colors.muted} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>No tickets yet</Text>
            <Text style={styles.emptyMuted}>After checkout, your mobile passes will appear here.</Text>
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16
  },
  badge: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 4
  },
  bookingItem: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    marginTop: 12,
    padding: 12
  },
  card: {
    marginBottom: 16
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 32
  },
  emptyIcon: {
    marginBottom: 16
  },
  emptyMuted: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900'
  },
  flexButton: {
    flex: 1
  },
  itemTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6
  },
  price: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 8
  },
  refundBox: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: 16,
    padding: 14
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24
  }
});
