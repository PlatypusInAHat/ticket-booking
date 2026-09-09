import React, { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Plus, X, MapPin, Calendar } from 'lucide-react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import Screen from '../components/Screen';
import { colors, radius } from '../theme';
import { formatCurrency, formatDate } from '../utils/format';

export default function TicketDetailModal({ ticket, onClose, onBook }) {
  const [selectedSeats, setSelectedSeats] = useState([]);
  const reservedSeating = ticket?.seatMap?.mode === 'reserved_seating';
  const seats = useMemo(() => (ticket?.seatMap?.sections || []).flatMap(section =>
    (section.rows || []).flatMap(row => (row.seats || []).map(seat => ({ ...seat, row: row.label, section: section.name })))
  ), [ticket]);

  useEffect(() => setSelectedSeats([]), [ticket?._id]);

  const toggleSeat = (seat) => {
    if (seat.status !== 'available') return;
    setSelectedSeats(current => current.includes(seat.code)
      ? current.filter(code => code !== seat.code)
      : current.length >= 10 ? current : [...current, seat.code]);
  };
  return (
    <Modal visible={Boolean(ticket)} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <Screen
          title="Event Details"
          subtitle={ticket?.eventName}
          right={<Button title="Close" icon={X} variant="ghost" onPress={onClose} style={styles.closeBtn} />}
        >
          {ticket ? (
            <Card style={styles.card}>
              <Image source={{ uri: ticket.image }} style={styles.image} />
              <Text style={styles.title}>{ticket.eventName}</Text>

              <View style={styles.infoRow}>
                <MapPin size={14} color={colors.muted} />
                <Text style={styles.muted}>{ticket.location?.venue}, {ticket.location?.city}</Text>
              </View>

              <View style={styles.infoRow}>
                <Calendar size={14} color={colors.muted} />
                <Text style={styles.muted}>{formatDate(ticket.date)} at {ticket.time}</Text>
              </View>

              <Text style={styles.price}>{formatCurrency(ticket.price)}</Text>
              <Text style={styles.description}>{ticket.description || 'This event does not have a detailed description yet.'}</Text>

              {reservedSeating ? (
                <View style={styles.seatArea}>
                  <Text style={styles.seatTitle}>Select seats</Text>
                  <View style={styles.seatGrid}>
                    {seats.map(seat => {
                      const selected = selectedSeats.includes(seat.code);
                      return (
                        <Pressable
                          key={seat.code}
                          disabled={seat.status !== 'available'}
                          onPress={() => toggleSeat(seat)}
                          style={[styles.seat, selected && styles.seatSelected, seat.status !== 'available' && styles.seatDisabled]}
                        >
                          <Text style={[styles.seatText, selected && styles.seatSelectedText]}>{seat.code}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              <View style={styles.actions}>
                <Button
                  title={reservedSeating ? `Add ${selectedSeats.length} seat(s)` : 'Add to cart'}
                  icon={Plus}
                  disabled={reservedSeating && selectedSeats.length === 0}
                  onPress={() => onBook({ ...ticket, seatCodes: selectedSeats, quantity: selectedSeats.length || 1 })}
                  style={styles.flexButton}
                />
              </View>
            </Card>
          ) : null}
        </Screen>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalWrap: {
    flex: 1,
    backgroundColor: colors.background
  },
  closeBtn: {
    paddingHorizontal: 8,
    minHeight: 40
  },
  card: {
    marginBottom: 40
  },
  description: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 16
  },
  image: {
    borderRadius: radius.md,
    height: 220,
    width: '100%',
    backgroundColor: colors.surfaceMuted,
    marginBottom: 8
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
    fontSize: 22,
    fontWeight: '900',
    marginTop: 12
  },
  seat: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    minWidth: 52,
    padding: 10
  },
  seatArea: {
    marginTop: 20
  },
  seatDisabled: {
    opacity: 0.3
  },
  seatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12
  },
  seatSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent
  },
  seatSelectedText: {
    color: colors.accentForeground
  },
  seatText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900'
  },
  seatTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900'
  },
  actions: {
    marginTop: 24
  },
  flexButton: {
    flex: 1
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
    marginTop: 8,
    marginBottom: 4
  }
});
