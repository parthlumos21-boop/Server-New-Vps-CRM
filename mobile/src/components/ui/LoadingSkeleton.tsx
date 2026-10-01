import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export const LoadingSkeleton = () => {
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim]);

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((item) => (
        <Animated.View key={item} style={[styles.card, { opacity: fadeAnim }]}>
          <View style={styles.header}>
            <View style={styles.lineLong} />
            <View style={styles.lineShort} />
          </View>
          <View style={styles.divider} />
          <View style={styles.content}>
            <View style={styles.row}>
              <View style={styles.lineShortest} />
              <View style={styles.lineMedium} />
            </View>
            <View style={styles.row}>
              <View style={styles.lineShortest} />
              <View style={styles.lineMedium} />
            </View>
          </View>
        </Animated.View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    padding: spacing.md,
  },
  header: {
    marginBottom: spacing.sm,
  },
  lineLong: {
    height: 18,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    width: '70%',
    marginBottom: 8,
  },
  lineShort: {
    height: 14,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    width: '40%',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  content: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lineMedium: {
    height: 14,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    width: '35%',
  },
  lineShortest: {
    height: 14,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    width: '20%',
  },
});
