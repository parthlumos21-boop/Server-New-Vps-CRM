import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  setMonth,
  setYear,
} from 'date-fns';
import { CalendarHeader } from './CalendarHeader';
import { CalendarWeekdays } from './CalendarWeekdays';
import { CalendarGrid } from './CalendarGrid';
import { CalendarMonthSelector } from './CalendarMonthSelector';
import { CalendarYearSelector } from './CalendarYearSelector';

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  reminders: any[];
  position?: 'bottom' | 'center';
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  visible,
  onClose,
  selectedDate,
  onSelectDate,
  reminders,
  position = 'bottom',
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarView, setCalendarView] = useState<'calendar' | 'months' | 'years'>('calendar');

  // Reset month view when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentMonth(selectedDate || new Date());
      setCalendarView('calendar');
    }
  }, [visible, selectedDate]);

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    onSelectDate(today);
  };

  const handleFilterToggle = () => {
    // Optional: implement filter logic if needed in the future
    onClose();
    onSelectDate(new Date(0)); // special value to indicate "All"
  };

  const handleMonthSelect = (monthIndex: number) => {
    setCurrentMonth(setMonth(currentMonth, monthIndex));
    setCalendarView('calendar');
  };

  const handleYearSelect = (year: number) => {
    setCurrentMonth(setYear(currentMonth, year));
    setCalendarView('calendar');
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const getRemindersCount = (date: Date) => {
    return reminders.filter((r) => {
      if (!r.dueDate) return false;
      const rDate = new Date(r.dueDate);
      return (
        rDate.getDate() === date.getDate() &&
        rDate.getMonth() === date.getMonth() &&
        rDate.getFullYear() === date.getFullYear()
      );
    }).length;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={position === 'bottom' ? "slide" : "fade"}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, position === 'center' && styles.overlayCenter]}>
          <TouchableWithoutFeedback>
            <View style={[styles.content, position === 'center' && styles.contentCenter]}>
              {position === 'bottom' && <View style={styles.handleBar} />}
              <CalendarHeader
                currentMonth={currentMonth}
                onPreviousMonth={handlePreviousMonth}
                onNextMonth={handleNextMonth}
                onToday={handleToday}
                onFilterToggle={handleFilterToggle}
                calendarView={calendarView}
                onMonthPress={() => setCalendarView('months')}
                onYearPress={() => setCalendarView('years')}
                onBack={() => setCalendarView('calendar')}
              />
              {calendarView === 'calendar' && (
                <>
                  <CalendarWeekdays isCompact={position === 'center'} />
                  <CalendarGrid
                    days={days}
                    currentMonth={currentMonth}
                    selectedDate={selectedDate}
                    onSelectDate={onSelectDate}
                    getRemindersCount={getRemindersCount}
                    isCompact={position === 'center'}
                  />
                </>
              )}
              {calendarView === 'months' && (
                <CalendarMonthSelector
                  currentMonth={currentMonth}
                  onSelectMonth={handleMonthSelect}
                />
              )}
              {calendarView === 'years' && (
                <CalendarYearSelector
                  currentYear={currentMonth.getFullYear()}
                  onSelectYear={handleYearSelect}
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.30)',
    justifyContent: 'flex-end',
  },
  overlayCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 32, // extra padding for bottom safe area
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    width: '100%',
  },
  contentCenter: {
    borderRadius: 20,
    paddingBottom: 24, // less padding for center
    maxWidth: 400,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
});
