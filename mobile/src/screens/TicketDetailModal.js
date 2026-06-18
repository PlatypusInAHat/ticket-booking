import React from 'react';
import { Image, Modal, StyleSheet, Text } from 'react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import Screen from '../components/Screen';
import { colors } from '../theme';
import { formatCurrency, formatDate } from '../utils/format';

export default function TicketDetailModal({ ticket, onClose, onBook }) {
  return (
    <Modal visible={Boolean(ticket)} animationType="slide" onRequestClose={onClose}>
      <Screen
        title="Chi tiết vé"
        subtitle={ticket?.eventName}
        right={<Button title="Đóng" variant="secondary" onPress={onClose} />}
      >
        {ticket ? (
          <Card>
            <Image source={{ uri: ticket.image }} style={styles.image} />
            <Text style={styles.title}>{ticket.eventName}</Text>
            <Text style={styles.muted}>{ticket.location?.venue}, {ticket.location?.city}</Text>
            <Text style={styles.muted}>{formatDate(ticket.date)} lúc {ticket.time}</Text>
            <Text style={styles.price}>{formatCurrency(ticket.price)}</Text>
            <Text style={styles.description}>{ticket.description || 'Sự kiện chưa có mô tả chi tiết.'}</Text>
            <Button title="Thêm vào giỏ" onPress={() => onBook(ticket)} style={styles.spacedTop} />
          </Card>
        ) : null}
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  description: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12
  },
  image: {
    borderRadius: 8,
    height: 220,
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
    fontSize: 20,
    fontWeight: '900',
    marginTop: 10
  },
  spacedTop: {
    marginTop: 14
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
    marginTop: 12
  }
});
