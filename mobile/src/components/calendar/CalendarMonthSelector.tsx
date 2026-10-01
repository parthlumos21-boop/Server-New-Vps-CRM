import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface CalendarMonthSelectorProps {
  currentMonth: Date;
  onSelectMonth: (monthIndex: number) => void;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar',
  'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep',
  'Oct', 'Nov', 'Dec',
];

export const CalendarMonthSelector: React.FC<CalendarMonthSelectorProps> = ({
  currentMonth,
  onSelectMonth,
}) => {
  const currentMonthIndex = currentMonth.getMonth();

  return (
    <View style={styles.container}>
      {MONTHS.map((month, index) => {
        const isSelected = index === currentMonthIndex;
        return (
          <TouchableOpacity
            key={month}
            style={[styles.monthButton, isSelected && styles.monthButtonSelected]}
            onPress={() => onSelectMonth(index)}
          >
            <Text style={[styles.monthText, isSelected && styles.monthTextSelected]}>
              {month}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 16,
    justifyContent: 'space-between',
  },
  monthButton: {
    width: '30%',
    aspectRatio: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  monthButtonSelected: {
    backgroundColor: '#FFF3F3',
    borderColor: '#E8B5B5',
  },
  monthText: {
    fontSize: 16,
    color: '#4B5563',
    fontWeight: '500',
  },
  monthTextSelected: {
    color: '#A00000',
    fontWeight: '700',
  },
});
