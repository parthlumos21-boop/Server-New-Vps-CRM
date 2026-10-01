import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { getCrmOwnerCode } from '../../../utils/crmUserDirectory';

interface TimelineReminderCardProps {
  item: any;
  accountInfo?: any;
  onPress: () => void;
}

const RED = '#F4512C';
const TEXT_PRIMARY = '#171717';
const TEXT_SECONDARY = '#666666';

export function TimelineReminderCard({ item, accountInfo, onPress }: TimelineReminderCardProps) {
  const title = item.title || item.taskName || 'Unknown';
  const status = item.status || 'scheduled';
  const rawOwner = accountInfo?.accountOwner || accountInfo?.ownerName || '';
  const dateStr = item.reminderDate || item.data?.reminderDate || item.dueDate || item.data?.dueDate || item.remindAt;
  const dueDate = dateStr ? new Date(dateStr).toLocaleDateString() : '-';
  const ownerCode = getCrmOwnerCode(rawOwner) || accountInfo?.accountOwnerCode || '-';
  const accountName = accountInfo?.accountName || accountInfo?.name || accountInfo?.companyName || '';

  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>Status: {status}</Text>
      </View>

      <View style={styles.metaRowFlex}>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>Due Date</Text>
          <Text style={styles.metaValue}>{dueDate}</Text>
        </View>
      </View>

      {accountInfo && (
        <View style={[styles.metaRowFlex, { marginTop: 4 }]}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Account ({ownerCode})</Text>
            <Text style={styles.metaValue} numberOfLines={1}>{accountName}</Text>
          </View>
        </View>
      )}

      <Text style={styles.actionText}>View Reminder &gt;</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingRight: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  metaRow: {
    marginBottom: 6,
  },
  metaRowFlex: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metaCol: {
    marginRight: 24,
  },
  metaText: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    textTransform: 'capitalize',
  },
  metaLabel: {
    fontSize: 10,
    color: '#999999',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 11,
    color: TEXT_PRIMARY,
    fontWeight: '500',
  },
  actionText: {
    fontSize: 12,
    color: RED,
    fontWeight: '600',
    marginTop: 4,
  }
});
