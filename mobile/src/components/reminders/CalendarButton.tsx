import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface CalendarButtonProps {
  onPress: () => void;
  isActive?: boolean;
  style?: ViewStyle;
}

export const CalendarButton: React.FC<CalendarButtonProps> = ({ onPress, isActive, style }) => {
  return (
    <TouchableOpacity style={[styles.button, isActive ? styles.activeButton : styles.inactiveButton, style]} onPress={onPress}>
      <Feather name="calendar" size={20} color={isActive ? "#FFFFFF" : "#1650C8"} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  activeButton: {
    backgroundColor: '#1650C8',
    borderColor: '#1650C8',
  },
  inactiveButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
});
