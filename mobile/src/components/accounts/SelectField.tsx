import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, ScrollView, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export type SelectOption = string | { label: string; value: string };

interface SelectFieldProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (val: string) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
  renderTrigger?: (onPress: () => void, value: string) => React.ReactNode;
  containerStyle?: any;
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  required,
  error,
  placeholder,
  renderTrigger,
  containerStyle,
}: SelectFieldProps) {
  const [visible, setVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  const getOptionLabel = (opt: SelectOption) => typeof opt === 'object' && opt !== null ? String(opt.label || '') : String(opt || '');
  const getOptionValue = (opt: SelectOption) => typeof opt === 'object' && opt !== null ? String(opt.value || '') : String(opt || '');

  const filteredOptions = options.filter(opt => 
    getOptionLabel(opt).toLowerCase().includes(searchText.toLowerCase())
  );

  const selectedOption = options.find(opt => String(getOptionValue(opt)) === String(value));
  const displayValue = selectedOption ? getOptionLabel(selectedOption) : value;

  return (
    <>
      <View style={[styles.container, containerStyle]}>
        {!!label && (
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        )}

        {renderTrigger ? (
          renderTrigger(() => setVisible(true), value)
        ) : (
          <Pressable
            style={[styles.input, error ? styles.inputError : null]}
            onPress={() => setVisible(true)}
          >
            <Text style={[styles.value, !value && styles.placeholder]}>
              {displayValue || placeholder || 'Select'}
            </Text>
          </Pressable>
        )}
        {!!error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
        onShow={() => setSearchText('')}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setVisible(false)}
        >
          <View style={styles.modal}>
            <View style={styles.searchContainer}>
              <Feather name="search" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search..."
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
                    return (
                      <Pressable
                        key={`${optValue}-${index}`}
                        style={styles.option}
                        onPress={() => {
                          onChange(optValue);
                          setVisible(false);
                        }}
                      >
                        <Text style={styles.optionText}>{optLabel}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
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
    height: 38,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputError: {
    borderColor: colors.error,
  },
  value: {
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
    justifyContent: 'center',
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
});
