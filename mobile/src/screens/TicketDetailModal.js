import React from 'react';
import { Image, Modal, StyleSheet, Text, View } from 'react-native';
import { Plus, X, MapPin, Calendar } from 'lucide-react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import Screen from '../components/Screen';
import { colors, radius } from '../theme';
import { formatCurrency, formatDate } from '../utils/format';

export default function TicketDetailModal({ ticket, onClose, onBook }) {
  return (
    <Modal visible={Boolean(ticket)} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <Screen
          title="Chi tiết sự kiện"
          subtitle={ticket?.eventName}
          right={<Button title="Đóng" icon={X} variant="ghost" onPress={onClose} style={styles.closeBtn} />}
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
                <Text style={styles.muted}>{formatDate(ticket.date)} lúc {ticket.time}</Text>
              </View>

              <Text style={styles.price}>{formatCurrency(ticket.price)}</Text>
              <Text style={styles.description}>{ticket.description || 'Sự kiện chưa có mô tả chi tiết.'}</Text>
              
              <View style={styles.actions}>
                <Button title="Thêm vào giỏ" icon={Plus} onPress={() => onBook(ticket)} style={styles.flexButton} />
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
