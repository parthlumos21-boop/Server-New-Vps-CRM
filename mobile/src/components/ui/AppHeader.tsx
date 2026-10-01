import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, BackHandler } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { router } from 'expo-router';

export interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  onSearch?: () => void;
  onFilter?: () => void;
  onMore?: () => void;
  onBack?: () => void;
  rightContent?: React.ReactNode;
}

export const AppHeader = ({ title, showBack = false, onSearch, onFilter, onMore, onBack, rightContent }: AppHeaderProps) => {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (showBack && onBack) {
      const backAction = () => {
        onBack();
        return true;
      };
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction,
      );
      return () => backHandler.remove();
    }
  }, [showBack, onBack]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <View style={styles.leftSection}>
          {showBack && (
            <Pressable onPress={() => onBack ? onBack() : router.back()} style={styles.iconButton}>
              <Feather name="arrow-left" size={24} color={colors.primary} />
            </Pressable>
          )}
          <Text style={[styles.title, showBack && styles.titleWithBack]} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View style={styles.rightSection}>
          {onFilter && (
            <Pressable onPress={onFilter} style={styles.iconButton}>
              <Feather name="sliders" size={20} color={colors.primary} />
            </Pressable>
          )}
          {onSearch && (
            <Pressable onPress={onSearch} style={styles.iconButton}>
              <Feather name="search" size={22} color={colors.primary} />
            </Pressable>
          )}
          {onMore && (
            <Pressable onPress={onMore} style={styles.iconButton}>
              <Feather name="more-vertical" size={22} color={colors.primary} />
            </Pressable>
          )}
          {rightContent}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
  },
  titleWithBack: {
    marginLeft: spacing.sm,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
});
