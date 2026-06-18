import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme';

export default function Field({ label, style, ...props }) {
  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor="#9CA3AF"
        style={styles.input}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 14
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 7
  },
  wrap: {
    marginBottom: 14
  }
});
