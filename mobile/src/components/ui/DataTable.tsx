import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export interface ColumnDefinition<T> {
  id: string;
  header: string;
  accessor: (item: T) => string | React.ReactNode;
  width?: number;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDefinition<T>[];
  onRowPress?: (item: T) => void;
  keyExtractor: (item: T, index: number) => string;
}

export function DataTable<T>({ data, columns, onRowPress, keyExtractor }: DataTableProps<T>) {
  const defaultWidth = 120;

  const renderHeader = () => (
    <View style={styles.headerRow}>
      {columns.map((col) => (
        <View key={col.id} style={[styles.headerCell, { width: col.width || defaultWidth }]}>
          <Text style={styles.headerText} numberOfLines={1}>{col.header}</Text>
        </View>
      ))}
    </View>
  );

  const renderRow = ({ item, index }: { item: T; index: number }) => {
    const rowContent = (
      <View style={[styles.row, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
        {columns.map((col) => (
          <View key={col.id} style={[styles.cell, { width: col.width || defaultWidth }]}>
            {React.isValidElement(col.accessor(item)) ? (
              col.accessor(item)
            ) : (
              <Text style={styles.cellText} numberOfLines={2}>
                {String(col.accessor(item) ?? '')}
              </Text>
            )}
          </View>
        ))}
      </View>
    );

    if (onRowPress) {
      return (
        <TouchableOpacity activeOpacity={0.7} onPress={() => onRowPress(item)}>
          {rowContent}
        </TouchableOpacity>
      );
    }

    return rowContent;
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal bounces={false} showsHorizontalScrollIndicator={true}>
        <View>
          {renderHeader()}
          <FlatList
            data={data}
            keyExtractor={keyExtractor}
            renderItem={renderRow}
            scrollEnabled={false}
            initialNumToRender={20}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCell: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  headerText: {
    ...typography.caption,
    fontWeight: 'bold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowEven: {
    backgroundColor: colors.white,
  },
  rowOdd: {
    backgroundColor: '#FAFAFA',
  },
  cell: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  cellText: {
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
  },
});
