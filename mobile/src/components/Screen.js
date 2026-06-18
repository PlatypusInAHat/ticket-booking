import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export default function Screen({ title, subtitle, right, children, scroll = true }) {
  const content = (
    <View style={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled">{content}</ScrollView> : content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 18
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18
  },
  headerText: {
    flex: 1,
    paddingRight: 12
  },
  safe: {
    backgroundColor: colors.background,
    flex: 1
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 5
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34
  }
});
