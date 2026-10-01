import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface FormFieldProps extends TextInputProps {
  label: string;
  required?: boolean;
  multiline?: boolean;
  error?: string;
}

export function FormField({
  label,
  required = false,
  multiline = false,
  error,
  ...props
}: FormFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      <TextInput
        {...props}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          multiline && styles.multiline,
          error ? styles.inputError : null,
        ]}
      />
      {!!error && <Text style={styles.errorText}>{error}</Text>}
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
    minHeight: 38,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 4,
    paddingHorizontal: 12,
    color: colors.textPrimary,
    ...typography.body,
  },
  inputError: {
    borderColor: colors.error,
  },
  multiline: {
    minHeight: 72,
    paddingTop: 10,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: 4,
    fontSize: 11,
  },
});
