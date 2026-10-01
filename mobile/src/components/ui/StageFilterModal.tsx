import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, ScrollView, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export type SelectOption = string | { label: string; value: string };

interface StageFilterModalProps {
  visible: boolean;
  value: string;
  options: SelectOption[];
  onChange: (val: string) => void;
  onClose: () => void;
}

export function StageFilterModal({
  visible,
  value,
  options,
  onChange,
  onClose,
}: StageFilterModalProps) {
  const [searchText, setSearchText] = useState('');

  const getOptionLabel = (opt: SelectOption) => typeof opt === 'string' ? opt : opt.label;
  const getOptionValue = (opt: SelectOption) => typeof opt === 'string' ? opt : opt.value;

  const filteredOptions = options.filter(opt => 
    getOptionLabel(opt).toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={() => setSearchText('')}
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
      >
        <View style={styles.modal} onStartShouldSetResponder={() => true}>
          <View style={styles.searchContainer}>
            <Feather name="search" size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search stages..."
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
          </View>
          <ScrollView showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled">
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View style={{ minWidth: '100%' }}>
                {filteredOptions.length === 0 ? <Text style={styles.noResults}>No results found</Text> : filteredOptions.map((option, index) => {
                  const optLabel = getOptionLabel(option);
                  const optValue = getOptionValue(option);
                  const isSelected = String(optValue) === String(value);
                  return (
                    <Pressable
                      key={`${optValue}-${index}`}
                      style={styles.option}
                      onPress={() => {
                        onChange(optValue);
                        onClose();
                      }}
                    >
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{optLabel}</Text>
                      {isSelected && <Feather name="check" size={18} color={colors.primary} />}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: colors.white,
    borderRadius: 8,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  option: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#F9FAFB',
  },
  searchInput: {
    flex: 1,
    height: 48,
    marginLeft: 8,
    ...typography.body,
    color: colors.textPrimary,
  },
  noResults: {
    padding: 18,
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  optionText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  optionTextSelected: {
    fontWeight: 'bold',
    color: colors.primary,
  }
});
