import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface CalendarWeekdaysProps {
  isCompact?: boolean;
}

export const CalendarWeekdays: React.FC<CalendarWeekdaysProps> = ({ isCompact = false }) => {
  return (
    <View style={styles.container}>
      {WEEKDAYS.map((day) => (
        <Text key={day} style={[styles.dayText, isCompact && styles.compactDayText]}>
          {day}
        </Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dayText: {
    width: 40,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: '#9A9A9A',
  },
  compactDayText: {
    width: 32,
    fontSize: 12,
  },
});
