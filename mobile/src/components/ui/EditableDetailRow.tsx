import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { colors } from '../../theme/colors';
import { CalendarModal } from '../calendar/CalendarModal';

export interface EditableDetailRowProps {
  label: string;
  value: string | number;
  fieldKey?: string;
  onSave?: (key: string, value: string) => Promise<void>;
  isEditable?: boolean;
  isStatusSection?: boolean;
  fieldType?: 'text' | 'date';
  valueStyle?: any;
  rowStyle?: any;
  labelStyle?: any;
}

export const EditableDetailRow = ({ 
  label, 
  value, 
  fieldKey, 
  onSave, 
  isEditable = true, 
  isStatusSection,
  fieldType = 'text',
  valueStyle,
  rowStyle,
  labelStyle
}: EditableDetailRowProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value !== '-' && value != null ? value : ''));
  const [isSaving, setIsSaving] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const lastTapRef = useRef<number>(0);
  const inputRef = useRef<TextInput>(null);

  const isDateField = fieldType === 'date' || label.toLowerCase().includes('date');

  useEffect(() => {
    setEditValue(String(value !== '-' && value != null ? value : ''));
  }, [value]);

  const handlePress = () => {
    if (!isEditable || !fieldKey || !onSave) return;
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (isDateField) {
        setShowCalendar(true);
      } else {
        setIsEditing(true);
        setEditValue(String(value !== '-' && value != null ? value : ''));
      }
    } else {
      lastTapRef.current = now;
    }
  };

  const handleDateSelect = async (selectedDate: Date) => {
    setShowCalendar(false);
    if (!onSave || !fieldKey || isSaving) return;
    
    // Format date as YYYY-MM-DD
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    setIsSaving(true);
    try {
      await onSave(fieldKey, dateStr);
    } finally {
      setIsSaving(false);
    }
  };

  const submitEdit = async () => {
    if (isSaving || !isEditing) return;
    
    const trimmedVal = editValue.trim();
    const originalVal = String(value !== '-' && value != null ? value : '');
    
    if (trimmedVal === originalVal) {
      setIsEditing(false);
      return;
    }
    
    setIsSaving(true);
    try {
      if (onSave && fieldKey) {
        await onSave(fieldKey, trimmedVal);
      }
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  const getInitialCalendarDate = (): Date => {
    if (value && value !== '-') {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  };

  return (
    <View style={[styles.row, rowStyle]}>
      <Text style={[styles.label, labelStyle]}>{label}</Text>
      {isEditing ? (
        <TextInput
          ref={inputRef}
          style={[styles.input, valueStyle]}
          value={editValue}
          onChangeText={setEditValue}
          autoFocus
          onBlur={submitEdit}
          onSubmitEditing={submitEdit}
          editable={!isSaving}
          returnKeyType="done"
          selectTextOnFocus
        />
      ) : (
        <Pressable onPress={handlePress} style={styles.valueContainer}>
          <Text style={[styles.value, valueStyle, isSaving && { opacity: 0.5 }]}>
            {value}
          </Text>
        </Pressable>
      )}

      {showCalendar && (
        <CalendarModal
          visible={showCalendar}
          onClose={() => setShowCalendar(false)}
          selectedDate={getInitialCalendarDate()}
          onSelectDate={handleDateSelect}
          reminders={[]}
          position="center"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f7fafc',
  },
  label: {
    flex: 1,
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  valueContainer: {
    flex: 1.5,
    justifyContent: 'center',
  },
  value: {
    fontSize: 14,
    color: '#2d3748',
    fontWeight: '600',
  },
  input: {
    flex: 1.5,
    fontSize: 14,
    color: '#2d3748',
    fontWeight: '600',
    padding: 0,
    margin: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
  }
});

