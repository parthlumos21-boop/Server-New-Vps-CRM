import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CalendarModal } from '../calendar/CalendarModal';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface DateFieldProps {
  label: string;
  value: string;
  required?: boolean;
  error?: string;
  onChange?: (date: Date) => void;
}

export function DateField({
  label,
  value,
  required,
  error,
  onChange,
}: DateFieldProps) {
  const [show, setShow] = useState(false);

  const formatForDisplay = (val: string) => {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const [year, month, day] = parts;
      return `${day}-${month}-${year}`;
    }
    return val;
  };

  const displayValue = formatForDisplay(value);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') {
      setShow(false);
    }
    if (selectedDate && onChange) {
      onChange(selectedDate);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      <Pressable
        style={[styles.input, error ? styles.inputError : null]}
        onPress={() => setShow(true)}
      >
        <Text style={[styles.text, !value && styles.placeholder]}>
          {displayValue || 'dd-mm-yyyy'}
        </Text>
        <View style={show ? styles.calendarButtonActive : styles.calendarButton}>
          <Feather name="calendar" size={16} color={show ? "#B91C1C" : colors.textMuted} />
        </View>
      </Pressable>
      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {show && (
        <CalendarModal
          visible={show}
          onClose={() => setShow(false)}
          selectedDate={value ? new Date(value) : new Date()}
          onSelectDate={(date) => {
            if (onChange) onChange(date);
            setShow(false);
          }}
          reminders={[]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  required: {
    color: colors.primary,
  },
  input: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 12,
    paddingRight: 4,
  },
  calendarButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarButtonActive: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  inputError: {
    borderColor: colors.error,
  },
  text: {
    ...typography.body,
    color: colors.textPrimary,
  },
  placeholder: {
    color: colors.textMuted,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: 4,
    fontSize: 11,
  },
});
