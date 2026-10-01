import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { colors } from '../../theme/colors';
import { radii, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface Props {
  selectedTime: string;
  onSelectTime: (time: string) => void;
}

const PREDEFINED_TIMES = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM',
  '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
];

export function TimeChipGrid({ selectedTime, onSelectTime }: Props) {
  const { width } = useWindowDimensions();
  const columns = width > 600 ? 4 : width > 380 ? 3 : 2;
  const chipWidth = `${100 / columns}%` as any;

  return (
    <View style={styles.grid}>
      {PREDEFINED_TIMES.map((time) => {
        const isSelected = selectedTime === time;
        return (
          <View key={time} style={{ width: chipWidth, padding: 5 }}>
            <TouchableOpacity
              style={[styles.chip, isSelected && styles.selectedChip]}
              onPress={() => onSelectTime(time)}
            >
              <Text style={[styles.chipText, isSelected && styles.selectedText]} numberOfLines={1} adjustsFontSizeToFit>
                {time}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    marginHorizontal: -5,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  selectedText: {
    color: colors.white,
  },
});
