import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

export default function Tabs({ tabs, activeTab, onChange }) {
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {tabs.map(tab => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange(tab.key)}
              style={[styles.tab, active && styles.activeTab]}
            >
              <Text style={[styles.label, active && styles.activeLabel]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  activeLabel: {
    color: colors.accentForeground
  },
  activeTab: {
    backgroundColor: colors.accent,
    borderColor: colors.accent
  },
  label: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700'
  },
  scroll: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  tab: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 16
  },
  wrap: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 16
  }
});
