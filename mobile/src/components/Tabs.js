import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export default function Tabs({ tabs, activeTab, onChange }) {
  return (
    <View style={styles.wrap}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  activeLabel: {
    color: '#fff'
  },
  activeTab: {
    backgroundColor: colors.teal,
    borderColor: colors.teal
  },
  label: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800'
  },
  tab: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 8
  },
  wrap: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    padding: 6
  }
});
