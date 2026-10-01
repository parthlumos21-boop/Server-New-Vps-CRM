import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export interface ResultsHeaderProps {
  count: number;
}

export const ResultsHeader = ({ count }: ResultsHeaderProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Results Found ({count})
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background, // Match screen background usually
  },
  text: {
    ...typography.subtitle,
    color: colors.primary, // Navy color
    fontWeight: 'bold',
  },
});
