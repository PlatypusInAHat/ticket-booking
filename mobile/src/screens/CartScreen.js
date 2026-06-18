import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import Screen from '../components/Screen';
import { colors } from '../theme';
import { formatCurrency, formatDate } from '../utils/format';

export default function CartScreen({ cart, onChangeQuantity, onRemove, onCheckout, loading }) {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Screen title="Giỏ hàng" subtitle="Kiểm tra vé trước khi thanh toán.">
      {cart.length === 0 ? (
        <Card>
          <Text style={styles.title}>Giỏ hàng đang trống</Text>
          <Text style={styles.muted}>Hãy thêm vé từ danh sách sự kiện.</Text>
        </Card>
      ) : (
        <>
          {cart.map(item => (
            <Card key={item._id} style={styles.card}>
              <Text style={styles.title}>{item.eventName}</Text>
              <Text style={styles.muted}>{item.location?.venue}, {item.location?.city}</Text>
              <Text style={styles.muted}>{formatDate(item.date)} lúc {item.time}</Text>
              <Text style={styles.price}>{formatCurrency(item.price)} / vé</Text>

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
                <Button title="Xóa" variant="danger" onPress={() => onRemove(item._id)} style={styles.removeButton} />
              </View>
            </Card>
          ))}

          <Card>
            <View style={styles.rowBetween}>
              <Text style={styles.muted}>Tổng số vé</Text>
              <Text style={styles.summaryValue}>{totalQuantity}</Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.muted}>Tạm tính</Text>
              <Text style={styles.total}>{formatCurrency(total)}</Text>
            </View>
            <Button title="Thanh toán" onPress={onCheckout} loading={loading} style={styles.checkoutButton} />
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14
  },
  cartActions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14
  },
  checkoutButton: {
    marginTop: 16
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
  quantity: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    minWidth: 36,
    textAlign: 'center'
  },
  removeButton: {
    minHeight: 40,
    paddingHorizontal: 14
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  stepButton: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 38
  },
  stepText: {
    color: colors.teal,
    fontSize: 22,
    fontWeight: '900'
  },
  stepper: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 8,
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
    lineHeight: 24
  },
  total: {
    color: colors.orange,
    fontSize: 20,
    fontWeight: '900'
  }
});
