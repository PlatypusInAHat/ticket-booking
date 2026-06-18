import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

export default function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, style }) {
  const isSecondary = variant === 'secondary';
  const isDanger = variant === 'danger';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        isSecondary && styles.secondary,
        isDanger && styles.danger,
        (pressed || disabled || loading) && styles.pressed,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary ? colors.teal : '#fff'} />
      ) : (
        <Text style={[styles.text, isSecondary && styles.secondaryText]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.teal,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  danger: {
    backgroundColor: colors.red
  },
  pressed: {
    opacity: 0.72
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1
  },
  secondaryText: {
    color: colors.teal
  },
  text: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800'
  }
});
