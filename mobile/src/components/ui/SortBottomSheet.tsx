import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export interface SortOption {
  label: string;
  value: string;
}

export interface SortBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  options: SortOption[];
  selectedSort: string;
  onSelectSort: (val: string) => void;
  sortDirection: 'asc' | 'desc';
  onSelectDirection: (val: 'asc' | 'desc') => void;
  onApply: () => void;
}

export const SortBottomSheet = ({ 
  visible, onClose, options, selectedSort, onSelectSort, sortDirection, onSelectDirection, onApply 
}: SortBottomSheetProps) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.dragHandle} />
          
          <View style={styles.header}>
            <Text style={styles.title}>Sort By</Text>
          </View>

          <View style={styles.content}>
            {options.map((opt) => (
              <TouchableOpacity key={opt.value} style={styles.radioRow} onPress={() => onSelectSort(opt.value)}>
                <Feather 
                  name={selectedSort === opt.value ? "check-circle" : "circle"} 
                  size={20} 
                  color={selectedSort === opt.value ? colors.primary : colors.textMuted} 
                />
                <Text style={styles.radioLabel}>{opt.label}</Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.sectionTitle}>Sort Direction</Text>
            <View style={styles.directionRow}>
              <TouchableOpacity 
                style={[styles.directionBtn, sortDirection === 'asc' && styles.directionBtnActive]}
                onPress={() => onSelectDirection('asc')}
              >
                <Text style={[styles.directionText, sortDirection === 'asc' && styles.directionTextActive]}>Ascending</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.directionBtn, sortDirection === 'desc' && styles.directionBtnActive]}
                onPress={() => onSelectDirection('desc')}
              >
                <Text style={[styles.directionText, sortDirection === 'desc' && styles.directionTextActive]}>Descending</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.applyButton} onPress={() => {
              onApply();
              onClose();
            }}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: spacing.sm,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  content: {
    padding: spacing.lg,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  radioLabel: {
    ...typography.body,
    marginLeft: spacing.sm,
    color: colors.textPrimary,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  directionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  directionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  directionBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryVeryLight,
  },
  directionText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  directionTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  applyButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
