import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { radii, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { format, addDays } from 'date-fns';

interface Props {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export function HorizontalDateSelector({ selectedDate, onSelectDate }: Props) {
  const flatListRef = useRef<FlatList>(null);
  
  const [startDate, setStartDate] = React.useState(() => {
    const d = new Date(selectedDate);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const dates = useMemo(() => {
    const list = [];
    for (let i = 0; i < 14; i++) {
      list.push(addDays(startDate, i));
    }
    return list;
  }, [startDate]);

  // Handle snapping and scrolling when selectedDate changes
  useEffect(() => {
    const sDate = new Date(selectedDate);
    sDate.setHours(0, 0, 0, 0);
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const diffDays = Math.round((sDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    // If selected date is outside our 14-day window, reset the start date
    if (diffDays < 0 || diffDays > 13) {
      setStartDate(sDate);
    } else {
      // If it's inside the window, scroll to it!
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: diffDays, animated: true, viewPosition: 0.5 });
      }, 100);
    }
  }, [selectedDate, startDate]);

  const renderItem = ({ item }: { item: Date }) => {
    const dateStr = format(item, 'yyyy-MM-dd');
    const isSelected = selectedDate === dateStr;
    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.selectedCard]}
        onPress={() => onSelectDate(dateStr)}
      >
        <Text style={[styles.dayText, isSelected && styles.selectedText]}>
          {format(item, 'EEE')}
        </Text>
        <Text style={[styles.dateText, isSelected && styles.selectedText]}>
          {format(item, 'dd')}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      ref={flatListRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      data={dates}
      keyExtractor={(item) => item.toISOString()}
      renderItem={renderItem}
      onScrollToIndexFailed={(info) => {
        const wait = new Promise(resolve => setTimeout(resolve, 500));
        wait.then(() => {
          flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
        });
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  card: {
    width: 60,
    height: 70,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  selectedCard: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dateText: {
    ...typography.subtitle,
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  selectedText: {
    color: colors.white,
  },
});
