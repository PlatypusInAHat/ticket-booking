import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { LogOut, User } from 'lucide-react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import Screen from '../components/Screen';
import { colors, radius } from '../theme';

export default function ProfileScreen({ auth, onLogout }) {
  const roleLabel = auth.user?.role === 'staff'
    ? 'Check-in staff'
    : auth.user?.role === 'admin'
      ? 'Administrator'
      : 'Customer';

  return (
    <Screen title="Profile" subtitle="Your signed-in mobile account.">
      <Card style={styles.card}>
        <User size={48} color={colors.muted} style={styles.icon} />
        <Text style={styles.title}>{auth.user?.name}</Text>
        <Text style={styles.muted}>{auth.user?.email}</Text>
        <Text style={styles.badge}>Role: {roleLabel}</Text>
        <Button title="Log out" icon={LogOut} variant="danger" onPress={onLogout} style={styles.spacedTop} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingVertical: 32
  },
  icon: {
    marginBottom: 16
  },
  badge: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 16,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 6
  },
  spacedTop: {
    marginTop: 24,
    width: '100%'
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900'
  }
});
