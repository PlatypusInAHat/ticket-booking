import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

export default function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, style, icon: Icon }) {
  const isSecondary = variant === 'secondary';
  const isDanger = variant === 'danger';
  const isGhost = variant === 'ghost';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        isSecondary && styles.secondary,
        isDanger && styles.danger,
        isGhost && styles.ghost,
        (pressed || disabled || loading) && styles.pressed,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary || isGhost ? colors.text : colors.accentForeground} />
      ) : (
        <View style={styles.content}>
          {Icon && <Icon size={18} color={isSecondary || isGhost ? colors.text : colors.accentForeground} style={styles.icon} />}
          <Text style={[
            styles.text, 
            isSecondary && styles.secondaryText,
            isGhost && styles.ghostText
          ]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  danger: {
    backgroundColor: colors.red
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0
  },
  ghostText: {
    color: colors.text
  },
  icon: {
    marginRight: 8
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
    color: colors.text
  },
  text: {
    color: colors.accentForeground,
    fontSize: 15,
    fontWeight: '800'
  }
});
