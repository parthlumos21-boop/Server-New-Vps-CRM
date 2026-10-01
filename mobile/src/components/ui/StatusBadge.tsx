import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

export interface StatusBadgeProps {
  status: string;
}

const getStatusColor = (status: string) => {
  const s = status.toLowerCase();
  if (['active', 'resolved', 'closed', 'won'].includes(s)) return { bg: '#DCFCE7', text: colors.success };
  if (['pending', 'in progress', 'open', 'negotiation'].includes(s)) return { bg: '#FEF3C7', text: colors.warning };
  if (['inactive', 'lost', 'rejected', 'failed'].includes(s)) return { bg: '#FEE2E2', text: colors.error };
  return { bg: colors.border, text: colors.textSecondary };
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  if (!status) return null;
  const color = getStatusColor(status);
  
  return (
    <View style={[styles.badge, { backgroundColor: color.bg }]}>
      <Text style={[styles.text, { color: color.text }]}>
        {status.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: 'bold',
  },
});
