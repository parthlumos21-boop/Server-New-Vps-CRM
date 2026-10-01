import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

export type ListControlsProps = {
  searchPlaceholder?: string;
  onSearch?: (text: string) => void;
  onFilterPress?: () => void;
  onSortPress?: () => void;
  filterLabel?: string;
  sortLabel?: string;
  onAddPress?: () => void;
  addLabel?: string;
  variant?: 'default' | 'slider';
};

export const ListControls: React.FC<ListControlsProps> = ({
  searchPlaceholder = 'Search...',
  onSearch,
  onFilterPress,
  onSortPress,
  filterLabel = 'All',
  onAddPress,
  addLabel = 'Add',
  variant = 'default',
}) => {
  if (!onFilterPress && !onAddPress) {
    return null;
  }

  const isSlider = variant === 'slider';

  return (
    <View style={styles.container}>
      <View style={styles.actionsContainer}>
        {onFilterPress && (
          <TouchableOpacity style={styles.actionButton} onPress={onFilterPress}>
            <Text style={styles.actionLabel}>Filter: </Text>
            <Text style={styles.actionValue}>{filterLabel}</Text>
            <Feather name="chevron-down" size={16} color="#718096" />
          </TouchableOpacity>
        )}
        {onAddPress && (
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.addButton, 
              isSlider && styles.sliderAddButton,
              !onFilterPress && { width: '100%', marginHorizontal: 0 }
            ]} 
            onPress={onAddPress}
          >
            <Feather name="plus" size={16} color={isSlider ? '#1650C8' : '#ffffff'} style={{ marginRight: 4 }} />
            <Text style={[styles.addButtonText, isSlider && styles.sliderAddButtonText]}>{addLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  actionLabel: {
    fontSize: 13,
    color: '#718096',
  },
  actionValue: {
    fontSize: 13,
    color: '#2d3748',
    fontWeight: '600',
    marginRight: 4,
  },
  addButton: {
    backgroundColor: '#1650C8',
    borderColor: '#1650C8',
  },
  addButtonText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  sliderAddButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    borderRadius: 20,
    paddingVertical: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  sliderAddButtonText: {
    color: '#1650C8',
    fontSize: 13,
    fontWeight: '600',
  }
});
