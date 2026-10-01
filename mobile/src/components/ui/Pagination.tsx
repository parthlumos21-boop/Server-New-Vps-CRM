import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../theme/colors'; // Assume this exists and has primary

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  if (totalPages <= 1) {
    return null; // Don't show pagination if only 1 page
  }

  // Calculate pages to show
  const pages = useMemo(() => {
    const list: number[] = [];
    
    if (currentPage === totalPages && totalPages > 1) {
      list.push(totalPages - 1);
      list.push(totalPages);
    } else {
      list.push(currentPage);
      if (currentPage + 1 <= totalPages) {
        list.push(currentPage + 1);
      }
    }

    return list;
  }, [currentPage, totalPages]);

  return (
    <View style={styles.container}>
      {/* First Button */}
      <TouchableOpacity
        style={[styles.button, styles.navButton, { marginRight: 4 }, currentPage === 1 && styles.disabledButton]}
        onPress={() => onPageChange(1)}
        disabled={currentPage === 1}
        accessibilityLabel="First Page"
      >
        <Text style={[styles.navText, currentPage === 1 && styles.disabledText]}>First</Text>
      </TouchableOpacity>

      {/* Back Button */}
      <TouchableOpacity
        style={[styles.button, styles.navButton, currentPage === 1 && styles.disabledButton]}
        onPress={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        accessibilityLabel="Previous Page"
      >
        <Feather name="chevron-left" size={16} color={currentPage === 1 ? colors.textMuted : colors.primary} />
      </TouchableOpacity>

      <View style={styles.pagesContainer}>
        {pages.map((pageNum) => {
          const isActive = pageNum === currentPage;

          return (
            <TouchableOpacity
              key={`page-${pageNum}`}
              style={[styles.button, styles.pageButton, isActive && styles.activePageButton]}
              onPress={() => onPageChange(pageNum)}
              accessibilityLabel={`Page ${pageNum}`}
            >
              <Text style={[styles.pageText, isActive && styles.activePageText]}>
                {pageNum}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Next Button */}
      <TouchableOpacity
        style={[styles.button, styles.navButton, currentPage === totalPages && styles.disabledButton]}
        onPress={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        accessibilityLabel="Next Page"
      >
        <Feather name="chevron-right" size={16} color={currentPage === totalPages ? colors.textMuted : colors.primary} />
      </TouchableOpacity>

      {/* Last Button */}
      <TouchableOpacity
        style={[styles.button, styles.navButton, { marginLeft: 4 }, currentPage === totalPages && styles.disabledButton]}
        onPress={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        accessibilityLabel="Last Page"
      >
        <Text style={[styles.navText, currentPage === totalPages && styles.disabledText]}>Last</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    width: '100%',
  },
  pagesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    height: 36,
    minWidth: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  navButton: {
    backgroundColor: colors.primaryLight,
  },
  pageButton: {
    backgroundColor: colors.background,
    marginHorizontal: 4,
  },
  activePageButton: {
    backgroundColor: colors.primary,
  },
  navText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 4,
  },
  pageText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  activePageText: {
    color: '#FFFFFF',
  },
  disabledButton: {
    backgroundColor: colors.background,
  },
  disabledText: {
    color: colors.textMuted,
  },
  ellipsisContainer: {
    height: 36,
    minWidth: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  ellipsisText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
