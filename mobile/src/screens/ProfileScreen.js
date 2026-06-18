import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import Screen from '../components/Screen';
import { colors } from '../theme';

export default function ProfileScreen({ auth, onLogout }) {
  const roleLabel = auth.user?.role === 'staff'
    ? 'Nhân viên check-in'
    : auth.user?.role === 'admin'
      ? 'Quản trị'
      : 'Khách hàng';

  return (
    <Screen title="Tài khoản" subtitle="Thông tin đăng nhập trên app mobile.">
      <Card>
        <Text style={styles.title}>{auth.user?.name}</Text>
        <Text style={styles.muted}>{auth.user?.email}</Text>
        <Text style={styles.badge}>Vai trò: {roleLabel}</Text>
        <Button title="Đăng xuất" variant="danger" onPress={onLogout} style={styles.spacedTop} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 12,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 6
  },
  spacedTop: {
    marginTop: 16
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900'
  }
});
