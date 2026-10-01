import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';

interface CalendarYearSelectorProps {
  currentYear: number;
  onSelectYear: (year: number) => void;
}

export const CalendarYearSelector: React.FC<CalendarYearSelectorProps> = ({
  currentYear,
  onSelectYear,
}) => {
  const years = useMemo(() => {
    const list = [];
    const startYear = currentYear - 100;
    const endYear = currentYear + 50;
    for (let y = startYear; y <= endYear; y++) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  const initialScrollIndex = Math.floor(100 / 3); // currentYear is at item index 100, row index is 100/3

  return (
    <View style={styles.container}>
      <FlatList
        data={years}
        keyExtractor={(item) => item.toString()}
        numColumns={3}
        initialScrollIndex={initialScrollIndex}
        getItemLayout={(data, index) => (
          { length: 50, offset: 50 * index, index }
        )}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => {
          const isSelected = item === currentYear;
          return (
            <TouchableOpacity
              style={[styles.yearButton, isSelected && styles.yearButtonSelected]}
              onPress={() => onSelectYear(item)}
            >
              <Text style={[styles.yearText, isSelected && styles.yearTextSelected]}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 300, // Fixed height or flex to fit inside modal
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  yearButton: {
    width: '30%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  yearButtonSelected: {
    backgroundColor: '#FFF3F3',
    borderColor: '#E8B5B5',
  },
  yearText: {
    fontSize: 16,
    color: '#4B5563',
    fontWeight: '500',
  },
  yearTextSelected: {
    color: '#A00000',
    fontWeight: '700',
  },
});
