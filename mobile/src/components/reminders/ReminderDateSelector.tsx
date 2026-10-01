import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { colors } from '../../theme/colors';
import { radii, shadows, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { format, addDays, isSameDay } from 'date-fns';

interface Props {
  selectedDate: Date | null;
  onDateChange: (date: Date | null) => void;
  variant?: 'default' | 'dashboard';
}

export function ReminderDateSelector({ selectedDate, onDateChange, variant = 'default' }: Props) {
  const flatListRef = useRef<FlatList>(null);
  
  // We need a stable reference date to generate the range around.
  // We use the selectedDate (or today) as the center.
  const [centerDate, setCenterDate] = React.useState<Date>(() => {
    const d = selectedDate ? new Date(selectedDate) : new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Generate a range: 30 days before centerDate, 60 days after centerDate (total 91 days)
  const dates = useMemo(() => {
    const list = [];
    const start = addDays(centerDate, -30);
    for (let i = 0; i <= 90; i++) {
      list.push(addDays(start, i));
    }
    return list;
  }, [centerDate]);

  // Handle snapping and centering when selectedDate changes (e.g. from external calendar)
  useEffect(() => {
    const target = selectedDate ? new Date(selectedDate) : new Date();
    target.setHours(0, 0, 0, 0);
    
    const start = addDays(centerDate, -30);
    start.setHours(0, 0, 0, 0);
    
    const diffDays = Math.round((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    // If selected date is near the edge of our window, or outside it, recenter
    if (diffDays < 10 || diffDays > 80) {
      setCenterDate(target);
    } else {
      // Scroll to the index
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: diffDays, animated: true, viewPosition: 0.5 });
      }, 100);
    }
  }, [selectedDate, centerDate]);

  const renderItem = ({ item }: { item: Date }) => {
    const isSelected = selectedDate ? isSameDay(item, selectedDate) : false;
    const isDashboard = variant === 'dashboard';

    return (
      <TouchableOpacity
        style={[
          isDashboard ? styles.cardDashboard : styles.card,
          isSelected && (isDashboard ? styles.selectedCardDashboard : styles.selectedCard)
        ]}
        onPress={() => {
          if (isSelected) {
            onDateChange(null);
          } else {
            onDateChange(item);
          }
        }}
        activeOpacity={0.7}
      >
        <Text style={[
          isDashboard ? styles.dayTextDashboard : styles.dayText, 
          isSelected && styles.selectedText
        ]}>
          {format(item, 'EEE').toUpperCase()}
        </Text>
        <Text style={[
          isDashboard ? styles.dateTextDashboard : styles.dateText, 
          isSelected && styles.selectedText
        ]}>
          {format(item, 'd')}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        data={dates}
        keyExtractor={(item) => item.toISOString()}
        renderItem={renderItem}
        getItemLayout={variant === 'default' ? (data, index) => (
          // card width is 52, marginRight is 12 -> total width is 64
          { length: 64, offset: 64 * index, index }
        ) : undefined}
        onScrollToIndexFailed={(info) => {
          const wait = new Promise(resolve => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingBottom: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.md,
  },
  card: {
    width: 52,
    height: 72,
    backgroundColor: 'transparent',
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedCard: {
    backgroundColor: '#1650C8',
    shadowColor: '#1650C8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cardDashboard: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'transparent',
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedCardDashboard: {
    backgroundColor: '#1650C8',
    shadowColor: '#1650C8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  dayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#667085',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#172033',
  },
  dayTextDashboard: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  dateTextDashboard: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  selectedText: {
    color: '#FFFFFF',
  },
});
