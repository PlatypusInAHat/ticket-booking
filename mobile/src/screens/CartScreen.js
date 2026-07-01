import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Trash2, MapPin, Calendar, CreditCard } from 'lucide-react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import Screen from '../components/Screen';
import { colors, radius } from '../theme';
import { formatCurrency, formatDate } from '../utils/format';

export default function CartScreen({ cart, onChangeQuantity, onRemove, onCheckout, loading }) {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Screen title="Cart" subtitle="Review your tickets before checkout.">
      {cart.length === 0 ? (
        <Card>
          <Text style={styles.title}>Your cart is empty</Text>
          <Text style={styles.muted}>Add tickets from the event list to continue.</Text>
        </Card>
      ) : (
        <>
          {cart.map(item => (
            <Card key={item._id} style={styles.card}>
              <Text style={styles.title}>{item.eventName}</Text>

              <View style={styles.infoRow}>
                <MapPin size={14} color={colors.muted} />
                <Text style={styles.muted}>{item.location?.venue}, {item.location?.city}</Text>
              </View>
              <View style={styles.infoRow}>
                <Calendar size={14} color={colors.muted} />
                <Text style={styles.muted}>{formatDate(item.date)} at {item.time}</Text>
              </View>

              <Text style={styles.price}>{formatCurrency(item.price)} / ticket</Text>

              <View style={styles.cartActions}>
                <View style={styles.stepper}>
                  <Pressable style={styles.stepButton} onPress={() => onChangeQuantity(item._id, item.quantity - 1)}>
                    <Text style={styles.stepText}>-</Text>
                  </Pressable>
                  <Text style={styles.quantity}>{item.quantity}</Text>
                  <Pressable style={styles.stepButton} onPress={() => onChangeQuantity(item._id, item.quantity + 1)}>
                    <Text style={styles.stepText}>+</Text>
                  </Pressable>
                </View>
                <Button title="Remove" icon={Trash2} variant="danger" onPress={() => onRemove(item._id)} style={styles.removeButton} />
              </View>
            </Card>
          ))}

          <Card style={styles.summaryCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.muted}>Total tickets</Text>
              <Text style={styles.summaryValue}>{totalQuantity}</Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.muted}>Subtotal</Text>
              <Text style={styles.total}>{formatCurrency(total)}</Text>
            </View>
            <Button title="Checkout" icon={CreditCard} onPress={onCheckout} loading={loading} style={styles.checkoutButton} />
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16
  },
  summaryCard: {
    marginTop: 8,
    marginBottom: 32,
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border
  },
  cartActions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  checkoutButton: {
    marginTop: 20
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
    marginTop: 12
  },
  quantity: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    minWidth: 36,
    textAlign: 'center'
  },
  removeButton: {
    minHeight: 40,
    paddingHorizontal: 16
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  stepButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40
  },
  stepText: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '900'
  },
  stepper: {
    alignItems: 'center',
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row'
  },
  summaryValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900'
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
    marginBottom: 6
  },
  total: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '900'
  }
});
