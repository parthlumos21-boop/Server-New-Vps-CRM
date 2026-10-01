import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

export function WizardHeader({ currentStep, totalSteps = 4 }: { currentStep: number; totalSteps?: number }) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step, index) => {
          const isActive = step <= currentStep;
          const isCompleted = step < currentStep;

          return (
            <React.Fragment key={step}>
              <View style={[styles.circle, isActive && styles.activeCircle]}>
                {isCompleted ? (
                  <Text style={styles.activeNumber}>✓</Text>
                ) : (
                  <Text style={[styles.number, isActive && styles.activeNumber]}>
                    {step}
                  </Text>
                )}
              </View>

              {index < totalSteps - 1 && (
                <View style={[styles.line, isActive && styles.activeLine]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      <View style={styles.bottomLine}>
        <View
          style={[
            styles.progress,
            { width: `${(currentStep / totalSteps) * 100}%` },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circle: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  activeCircle: {
    backgroundColor: colors.primary, // Red from dashboard theme
  },
  number: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  activeNumber: {
    color: colors.white,
  },
  line: {
    height: 1,
    flex: 1,
    backgroundColor: colors.border,
  },
  activeLine: {
    backgroundColor: colors.primary,
  },
  bottomLine: {
    height: 2,
    marginTop: 12,
    backgroundColor: colors.border,
  },
  progress: {
    height: 2,
    backgroundColor: colors.primary,
  },
});
