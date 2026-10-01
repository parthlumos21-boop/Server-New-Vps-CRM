import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing, radii, shadows } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface SearchResultCardProps {
  title: string;
  subtitle?: string;
  description?: string;
  fields: { label: string; value: string }[];
  onPress?: () => void;
}

export function SearchResultCard({ title, subtitle, description, fields, onPress }: SearchResultCardProps) {
  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      
      {fields.length > 0 && (
        <View style={styles.body}>
          {fields.map((field, index) => (
            <View key={index} style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{field.label}:</Text>
              <Text style={styles.fieldValue} numberOfLines={1}>{field.value || '-'}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background, // Slightly different shade for header
  },
  title: {
    ...typography.subtitle,
    color: colors.primary, // Red accent for titles
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
    marginBottom: 2,
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  body: {
    padding: spacing.md,
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'center',
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    width: 80,
  },
  fieldValue: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
});
