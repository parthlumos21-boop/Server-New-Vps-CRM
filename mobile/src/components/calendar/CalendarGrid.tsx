import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CalendarDay } from './CalendarDay';

interface CalendarGridProps {
  days: Date[]; // Includes padding days as null/empty or dates outside month
  currentMonth: Date;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  getRemindersCount: (date: Date) => number;
  isCompact?: boolean;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  days,
  currentMonth,
  selectedDate,
  onSelectDate,
  getRemindersCount,
  isCompact = false,
}) => {
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  days.forEach((day, index) => {
    currentWeek.push(day);
    if (currentWeek.length === 7 || index === days.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const isSameDay = (d1: Date | null, d2: Date | null) => {
    if (!d1 || !d2) return false;
    return (
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    );
  };

  const today = new Date();

  return (
    <View style={styles.container}>
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.weekRow}>
          {week.map((day, dayIndex) => {
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            return (
              <CalendarDay
                key={dayIndex}
                date={isCurrentMonth ? day : null} // Pass null to render empty space for days outside month
                isToday={isSameDay(day, today)}
                isSelected={isSameDay(day, selectedDate)}
                remindersCount={isCurrentMonth ? getRemindersCount(day) : 0}
                onPress={onSelectDate}
                isCompact={isCompact}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
});
