import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { StatusBadge } from './StatusBadge';

export interface FieldRowProps {
  label: string;
  value: string | number;
}

export interface CRMRecordCardProps {
  title: string;
  subtitle?: string;
  fields: FieldRowProps[];
  status?: string;
  onPress: () => void;
  rightAction?: React.ReactNode;
}

export const CRMRecordCard = ({ title, subtitle, fields, status, onPress, rightAction }: CRMRecordCardProps) => {
  return (
    <Pressable 
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed
      ]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {rightAction || (
          <View style={styles.rightAction}>
            <Feather name="more-vertical" size={20} color={colors.textSecondary} />
          </View>
        )}
      </View>

      <View style={styles.divider} />

      <View style={styles.fieldsContainer}>
        {fields.map((field, index) => (
          <View key={index} style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <Text style={styles.fieldValue} numberOfLines={1}>{field.value}</Text>
          </View>
        ))}
      </View>

      {status && (
        <View style={styles.footer}>
          <Text style={styles.fieldLabel}>Status</Text>
          <View style={styles.statusRow}>
            <StatusBadge status={status} />
            <Feather name="chevron-right" size={20} color={colors.textMuted} />
          </View>
        </View>
      )}
      
      {!status && (
        <View style={styles.footerEmpty}>
           <Feather name="chevron-right" size={20} color={colors.textMuted} style={styles.arrowIcon} />
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardPressed: {
    backgroundColor: colors.primaryVeryLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  rightAction: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  fieldsContainer: {
    padding: spacing.md,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  fieldValue: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 2,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerEmpty: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  arrowIcon: {
    marginTop: -8,
  }
});
