import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';

interface CalendarHeaderProps {
  currentMonth: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onFilterToggle: () => void;
  calendarView: 'calendar' | 'months' | 'years';
  onMonthPress: () => void;
  onYearPress: () => void;
  onBack: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentMonth,
  onPreviousMonth,
  onNextMonth,
  onToday,
  onFilterToggle,
  calendarView,
  onMonthPress,
  onYearPress,
  onBack,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {calendarView === 'calendar' ? (
          <TouchableOpacity onPress={onPreviousMonth} style={styles.iconButton}>
            <Feather name="chevron-left" size={24} color="#A00000" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onBack} style={styles.iconButton}>
            <Feather name="chevron-left" size={24} color="#A00000" />
          </TouchableOpacity>
        )}
        
        <View style={styles.titleContainer}>
          {calendarView === 'calendar' ? (
            <View style={styles.monthYearContainer}>
              <TouchableOpacity onPress={onMonthPress}>
                <Text style={styles.titleText}>{format(currentMonth, 'MMM')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onYearPress}>
                <Text style={styles.titleText}>{format(currentMonth, 'yyyy')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.titleText}>
              {calendarView === 'months' ? 'Select Month' : 'Select Year'}
            </Text>
          )}
        </View>

        {calendarView === 'calendar' ? (
          <TouchableOpacity onPress={onNextMonth} style={styles.iconButton}>
            <Feather name="chevron-right" size={24} color="#A00000" />
          </TouchableOpacity>
        ) : (
          <View style={[styles.iconButton, { opacity: 0 }]} pointerEvents="none">
            <Feather name="chevron-right" size={24} color="#A00000" />
          </View>
        )}
        
        <TouchableOpacity style={styles.infoButton}>
          <Feather name="info" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.todayButton} onPress={onToday}>
          <Text style={styles.todayText}>Today</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  titleContainer: {
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYearContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  iconButton: {
    padding: 8,
  },
  infoButton: {
    position: 'absolute',
    right: 0,
    padding: 8,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    gap: 4,
  },
  filterText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  todayButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#A00000',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  todayText: {
    fontSize: 14,
    color: '#A00000',
    fontWeight: '600',
  },
});
