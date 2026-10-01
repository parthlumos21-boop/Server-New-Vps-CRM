import React from 'react';
import { Text, StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, radii, shadows } from '../theme/spacing';
import { typography } from '../theme/typography';

interface QuickActionProps {
  title: string;
  icon: string;
  iconFamily?: 'Feather' | 'FontAwesome5';
  variant?: 'primary' | 'secondary' | 'tertiary';
  isActive?: boolean;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export function QuickAction({ title, icon, iconFamily = 'Feather', variant = 'secondary', isActive = true, style, onPress }: QuickActionProps) {
  const isPrimary = variant === 'primary';
  const isTertiary = variant === 'tertiary';
  
  const buttonBgStyle = isPrimary
    ? styles.primaryButton
    : isTertiary
    ? styles.tertiaryButton
    : isActive
    ? styles.secondaryButtonActive
    : styles.secondaryButtonInactive;

  const iconColor = isPrimary
    ? '#FFFDF9'
    : isTertiary
    ? colors.textSecondary
    : colors.sliderButtonBorder;

  const textColor = isPrimary
    ? '#FFFDF9'
    : isTertiary
    ? colors.textSecondary
    : colors.sliderButtonBorder;

  return (
    <Pressable 
      style={({ pressed }) => [
        styles.button,
        buttonBgStyle,
        style,
        pressed && styles.pressed
      ]}
      onPress={onPress}
    >
      {({ pressed }) => (
        <>
          {iconFamily === 'FontAwesome5' ? (
            <FontAwesome5 
              name={icon as any} 
              size={13} 
              color={pressed && !isPrimary ? colors.sliderButtonBorder : iconColor} 
              style={styles.icon}
            />
          ) : (
            <Feather 
              name={icon as any} 
              size={13} 
              color={pressed && !isPrimary ? colors.sliderButtonBorder : iconColor} 
              style={styles.icon}
            />
          )}
          <Text style={[
            styles.text,
            { color: textColor },
          ]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.round,
    marginRight: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButtonActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
  },
  secondaryButtonInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
  },
  tertiaryButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    elevation: 0,
    shadowOpacity: 0,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
});
