import React from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MapPin, Calendar, Plus, Eye } from 'lucide-react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import Screen from '../components/Screen';
import { colors, radius } from '../theme';
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
      
      <View style={styles.infoRow}>
        <MapPin size={14} color={colors.muted} />
        <Text style={styles.muted}>{ticket.location?.venue}, {ticket.location?.city}</Text>
      </View>
      
      <View style={styles.infoRow}>
        <Calendar size={14} color={colors.muted} />
        <Text style={styles.muted}>{formatDate(ticket.date)} lúc {ticket.time}</Text>
      </View>

      <Text style={styles.available}>Còn {ticket.availableSeats} vé</Text>
      <View style={styles.actions}>
        <Button title="Chi tiết" icon={Eye} variant="secondary" onPress={() => onOpen(ticket)} style={styles.flexButton} />
        <Button title="Thêm giỏ" icon={Plus} onPress={() => onBook(ticket)} style={styles.flexButton} />
      </View>
    </Card>
  );
}

export default function TicketsScreen({ tickets, loading, refresh, onOpenTicket, onBookTicket }) {
  return (
    <Screen title="Khám phá vé" subtitle="Chọn sự kiện, chuyến đi hoặc suất chiếu phù hợp.">
      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.accent} />}
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
    gap: 12,
    marginTop: 16
  },
  available: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 12
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
  card: {
    marginBottom: 16
  },
  flexButton: {
    flex: 1
  },
  image: {
    borderRadius: radius.md,
    height: 180,
    width: '100%',
    backgroundColor: colors.surfaceMuted
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  price: {
    color: colors.accent,
    fontSize: 18,
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
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
    marginTop: 12,
    marginBottom: 4
  }
});
