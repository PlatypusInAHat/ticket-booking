import React from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import Screen from '../components/Screen';
import { colors } from '../theme';
import { formatCurrency, formatDate } from '../utils/format';
import { eventTypeLabels, getLabel } from '../utils/labels';

function TicketCard({ ticket, onOpen, onBook }) {
  return (
    <Card style={styles.card}>
      <Image source={{ uri: ticket.image }} style={styles.image} />
      <View style={styles.rowBetween}>
        <Text style={styles.badge}>{getLabel(eventTypeLabels, ticket.eventType)}</Text>
        <Text style={styles.price}>{formatCurrency(ticket.price)}</Text>
      </View>
      <Text style={styles.title}>{ticket.eventName}</Text>
      <Text style={styles.muted}>{ticket.location?.venue}, {ticket.location?.city}</Text>
      <Text style={styles.muted}>{formatDate(ticket.date)} lúc {ticket.time}</Text>
      <Text style={styles.available}>Còn {ticket.availableSeats} vé</Text>
      <View style={styles.actions}>
        <Button title="Chi tiết" variant="secondary" onPress={() => onOpen(ticket)} style={styles.flexButton} />
        <Button title="Thêm giỏ" onPress={() => onBook(ticket)} style={styles.flexButton} />
      </View>
    </Card>
  );
}

export default function TicketsScreen({ tickets, loading, refresh, onOpenTicket, onBookTicket }) {
  return (
    <Screen title="Khám phá vé" subtitle="Chọn sự kiện, chuyến đi hoặc suất chiếu phù hợp.">
      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        scrollEnabled={false}
      >
        {tickets.map(ticket => (
          <TicketCard
            key={ticket._id}
            ticket={ticket}
            onOpen={onOpenTicket}
            onBook={onBookTicket}
          />
        ))}
        {!loading && tickets.length === 0 ? (
          <Card>
            <Text style={styles.title}>Chưa có vé đang bán</Text>
            <Text style={styles.muted}>Hãy chạy backend seed hoặc kiểm tra kết nối API.</Text>
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12
  },
  available: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8
  },
  badge: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  card: {
    marginBottom: 14
  },
  flexButton: {
    flex: 1
  },
  image: {
    borderRadius: 8,
    height: 180,
    width: '100%'
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 5
  },
  price: {
    color: colors.orange,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 8
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
    marginTop: 8
  }
});
