import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, StyleProp, ViewStyle } from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface PastelTheme {
  bg: string;
  accent: string;
  badgeBg: string;
  subtext: string;
}

const PASTEL_THEMES: Record<string, PastelTheme> = {
  'Accounts': colors.pastel.accounts,
  'My Group Accounts': colors.pastel.groupAccounts,
  'Deals': colors.pastel.deals,
  'Customers': colors.pastel.customers,
  'Support Requests': colors.pastel.supportRequests,
  'Quotations': colors.pastel.quotations,
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  iconFamily?: 'Feather' | 'FontAwesome5';
  variant?: 'hero' | 'bento' | 'full' | 'overview-hero';
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  primaryColor?: string;
  lightColor?: string;
  isPrimaryCard?: boolean;
  suffix?: string;
}

export function StatCard({
  title,
  value,
  icon,
  iconFamily = 'Feather',
  variant = 'bento',
  style,
  onPress,
  primaryColor,
  lightColor,
  isPrimaryCard = false,
  suffix = '',
}: StatCardProps) {
  const [showExact, setShowExact] = useState(false);

  const theme = PASTEL_THEMES[title] || {
    bg: lightColor || '#F3F4F6',
    accent: primaryColor || '#1F2937',
    badgeBg: '#FFFFFF',
    subtext: '#6B7280',
  };

  const isHero = variant === 'hero';
  const isFull = variant === 'full';
  const isOverview = variant === 'overview-hero';

  const cardBg = colors.card;
  const textColor = theme.accent;
  const titleColor = colors.textPrimary;
  const iconColor = colors.dashboardIconColor;
  const badgeBgColor = theme.bg;

  // Calculate rounded milestone (e.g. 38 -> 30, 22 -> 20)
  const numVal = typeof value === 'number' ? value : parseInt(String(value), 10);
  const hasRoundedVal = !isNaN(numVal) && numVal >= 10;
  const milestoneVal = hasRoundedVal ? Math.floor(numVal / 10) * 10 : value;

  const displayedNumber = isOverview ? (showExact ? value : milestoneVal) : value;
  const currentSuffix = isOverview ? (showExact ? '' : (suffix || '+')) : suffix;

  const subLabel = title === 'Deals' ? 'Total Deals' : title === 'Customers' ? 'Total Customers' : `Total ${title}`;

  const handlePress = () => {
    if (isOverview) {
      setShowExact(prev => !prev);
    }
    if (onPress) {
      onPress();
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.cardWrapper,
        { backgroundColor: cardBg },
        isHero && styles.heroCardWrapper,
        isFull && styles.fullCardWrapper,
        isOverview && styles.overviewCardWrapper,
        style,
        pressed && styles.cardPressed,
      ]}
      onPress={handlePress}
    >
      {isFull ? (
        <View style={styles.fullContainer}>
          <View style={styles.fullLeft}>
            <View style={[styles.iconBadge, { backgroundColor: badgeBgColor }]}>
              {iconFamily === 'FontAwesome5' ? (
                <FontAwesome5 name={icon as any} size={15} color={iconColor} />
              ) : (
                <Feather name={icon as any} size={15} color={iconColor} />
              )}
            </View>
            <View style={{ marginLeft: 10 }}>
              <Text style={[styles.fullTitle, { color: titleColor }]}>{title}</Text>
              <Text style={styles.subtext}>Active Overview</Text>
            </View>
          </View>
          <View style={styles.fullRight}>
            <View style={styles.valueRow}>
              <Text style={[styles.fullValue, { color: textColor }]}>{displayedNumber}</Text>
              {currentSuffix ? <Text style={[styles.suffixText, { color: textColor }]}>{currentSuffix}</Text> : null}
            </View>
            <Feather name="arrow-up-right" size={16} color={textColor} style={{ marginLeft: 6, opacity: 0.7 }} />
          </View>
        </View>
      ) : isOverview ? (
        <View style={styles.overviewContainer}>
          <View style={styles.topRow}>
            <View style={[styles.iconBadge, { backgroundColor: badgeBgColor }]}>
              {iconFamily === 'FontAwesome5' ? (
                <FontAwesome5 name={icon as any} size={15} color={iconColor} />
              ) : (
                <Feather name={icon as any} size={15} color={iconColor} />
              )}
            </View>
            <Text style={[styles.overviewTitle, { color: titleColor }]}>{title}</Text>
          </View>
          <View style={styles.overviewBody}>
            <View style={styles.valueRow}>
              <Text style={[styles.overviewValue, { color: textColor }]}>{displayedNumber}</Text>
              {currentSuffix ? <Text style={[styles.suffixTextSmall, { color: textColor }]}>{currentSuffix}</Text> : null}
            </View>
            {showExact && <Text style={styles.exactSubtext}>{subLabel}</Text>}
          </View>
        </View>
      ) : isHero ? (
        <View style={styles.heroContainer}>
          <View style={styles.topRow}>
            <View style={[styles.iconBadge, { backgroundColor: badgeBgColor }]}>
              {iconFamily === 'FontAwesome5' ? (
                <FontAwesome5 name={icon as any} size={18} color={iconColor} />
              ) : (
                <Feather name={icon as any} size={18} color={iconColor} />
              )}
            </View>
            <View style={styles.actionArrowCircle}>
              <Feather name="arrow-up-right" size={16} color={textColor} />
            </View>
          </View>
          <View style={styles.heroContent}>
            <View style={styles.valueRow}>
              <Text style={[styles.heroValue, { color: textColor }]}>{displayedNumber}</Text>
              {currentSuffix ? <Text style={[styles.suffixTextHero, { color: textColor }]}>{currentSuffix}</Text> : null}
            </View>
            <Text style={[styles.heroTitle, { color: titleColor }]}>{title}</Text>
            <Text style={styles.subtext}>Total Active CRM Accounts</Text>
          </View>
        </View>
      ) : (
        <View style={styles.bentoContainer}>
          <View style={styles.topRow}>
            <View style={[styles.iconBadge, { backgroundColor: badgeBgColor }]}>
              {iconFamily === 'FontAwesome5' ? (
                <FontAwesome5 name={icon as any} size={15} color={iconColor} />
              ) : (
                <Feather name={icon as any} size={15} color={iconColor} />
              )}
            </View>
            <Feather name="arrow-up-right" size={14} color={textColor} style={{ opacity: 0.6 }} />
          </View>
          <View style={styles.bentoBody}>
            <Text style={[styles.bentoTitle, { color: titleColor }]} numberOfLines={1}>{title}</Text>
            <View style={styles.valueRow}>
              <Text style={[styles.bentoValue, { color: textColor }]}>{value}</Text>
              {suffix ? <Text style={[styles.suffixTextSmall, { color: textColor }]}>{suffix}</Text> : null}
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    padding: 14,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  heroCardWrapper: {
    width: '100%',
    marginBottom: 14,
  },
  fullCardWrapper: {
    width: '100%',
    marginBottom: 14,
  },
  overviewCardWrapper: {
    padding: 14,
    marginBottom: 0,
    borderRadius: 20,
  },
  overviewContainer: {
    justifyContent: 'space-between',
    minHeight: 90,
  },
  overviewTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  overviewBody: {
    marginTop: 6,
  },
  overviewValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  suffixText: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 2,
  },
  suffixTextSmall: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 2,
  },
  suffixTextHero: {
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 3,
  },
  exactSubtext: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '600',
    marginTop: 2,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.95,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  actionArrowCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  heroContainer: {
    justifyContent: 'space-between',
    minHeight: 110,
  },
  heroContent: {
    marginTop: 4,
  },
  heroValue: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtext: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.textSecondary,
    marginTop: 2,
  },
  bentoContainer: {
    minHeight: 94,
    justifyContent: 'space-between',
  },
  bentoBody: {
    marginTop: 'auto',
  },
  bentoTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
    lineHeight: 16,
  },
  bentoValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  fullContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  fullLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  fullValue: {
    fontSize: 24,
    fontWeight: '800',
  },
});
