import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { format, subDays } from 'date-fns';
import { colors } from '../../theme/colors';

export interface DealItem {
  _id?: string;
  id?: string;
  amount?: number;
  value?: number;
  dealValue?: number;
  poValue?: number;
  convertPo?: boolean;
  dealDate?: string;
  createdAt?: string;
  [key: string]: any;
}

interface DealsHeroCardProps {
  deals?: DealItem[] | null;
  dealsCountOverride?: number | string;
  onPress?: () => void;
}

export function formatIndianCurrency(num: number): string {
  if (isNaN(num) || num <= 0) return '₹0';
  if (num >= 10000000) {
    const cr = num / 10000000;
    return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)}Cr`;
  }
  if (num >= 100000) {
    const lakh = num / 100000;
    return `₹${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(2)}L`;
  }
  if (num >= 1000) {
    const k = num / 1000;
    return `₹${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return `₹${Math.round(num).toLocaleString('en-IN')}`;
}

export const DealsHeroCard = React.memo<DealsHeroCardProps>(({ deals, dealsCountOverride, onPress }) => {
  const analytics = useMemo(() => {
    const dealList = Array.isArray(deals) ? deals : [];
    
    let totalDealValue = 0;
    let totalPoValue = 0;

    // Aggregate values
    dealList.forEach((d) => {
      const val = Number(d.amount || d.value || d.dealValue || 0);
      totalDealValue += val;

      if (d.poValue && !isNaN(Number(d.poValue))) {
        totalPoValue += Number(d.poValue);
      } else if (d.convertPo) {
        totalPoValue += val;
      }
    });

    const count = dealsCountOverride !== undefined ? dealsCountOverride : dealList.length;
    const conversionRate = totalDealValue > 0 ? Math.min(100, Math.round((totalPoValue / totalDealValue) * 100)) : 0;

    // Calculate 6 time-slot buckets for last 30 days sparkline
    const now = new Date();
    const buckets = Array(6).fill(0);
    const bucketDays = 5; // 6 buckets of 5 days = 30 days

    dealList.forEach((d) => {
      const dateStr = d.dealDate || d.createdAt;
      if (!dateStr) return;
      const dDate = new Date(dateStr);
      if (isNaN(dDate.getTime())) return;

      const diffTime = now.getTime() - dDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays < 30) {
        const bucketIndex = Math.min(5, 5 - Math.floor(diffDays / bucketDays));
        const val = Number(d.amount || d.value || d.dealValue || 0);
        buckets[bucketIndex] += val;
      }
    });

    // If all buckets 0, provide subtle default visual pattern so chart looks active
    const maxVal = Math.max(...buckets, 1);
    const sparklineHeights = buckets.map((val) => {
      if (val === 0) return 18; // default 18% min height for aesthetics
      return Math.max(25, Math.round((val / maxVal) * 100));
    });

    // Date axis labels
    const dateLabelStart = format(subDays(now, 30), 'MMM d');
    const dateLabelMid = format(subDays(now, 15), 'MMM d');
    const dateLabelEnd = format(now, 'MMM d');

    return {
      totalDealValue,
      totalPoValue,
      count,
      conversionRate,
      sparklineHeights,
      dateLabelStart,
      dateLabelMid,
      dateLabelEnd,
    };
  }, [deals, dealsCountOverride]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.cardContainer,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      {/* 1. Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Feather name="trending-up" size={16} color={colors.dealCardText} style={{ marginRight: 6 }} />
          <Text style={styles.cardTitle}>Deals</Text>
        </View>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>30 days</Text>
        </View>
      </View>

      {/* 2. Hero Deal Value + Sparkline Row */}
      <View style={styles.middleSection}>
        <View style={styles.valueContainer}>
          <Text style={styles.heroValue}>{formatIndianCurrency(analytics.totalDealValue)}</Text>
          <Text style={styles.valueLabel}>Total Deal Value</Text>
        </View>

        {/* Lightweight SVG-like bar sparkline visual */}
        <View style={styles.sparklineContainer}>
          <View style={styles.barsRow}>
            {analytics.sparklineHeights.map((heightPct, idx) => (
              <View key={idx} style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${heightPct}%`,
                      backgroundColor: idx === 5 ? colors.dealCardText : 'rgba(255, 253, 249, 0.65)',
                    },
                  ]}
                />
              </View>
            ))}
          </View>
          <View style={styles.datesRow}>
            <Text style={styles.dateText}>{analytics.dateLabelStart}</Text>
            <Text style={styles.dateText}>{analytics.dateLabelMid}</Text>
            <Text style={styles.dateText}>{analytics.dateLabelEnd}</Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      {/* 3. Bottom Row equal-weight metrics */}
      <View style={styles.bottomRow}>
        <View style={styles.metricCell}>
          <Text style={styles.metricValue}>{analytics.count}</Text>
          <Text style={styles.metricLabel}>Deals</Text>
        </View>

        <View style={styles.metricSeparator} />

        <View style={styles.metricCell}>
          <Text style={styles.metricValue}>{formatIndianCurrency(analytics.totalPoValue)}</Text>
          <Text style={styles.metricLabel}>PO Value</Text>
        </View>

        <View style={styles.metricSeparator} />

        <View style={styles.metricCell}>
          <Text style={styles.metricValue}>{analytics.conversionRate}%</Text>
          <Text style={styles.metricLabel}>PO Conv.</Text>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: colors.dealCardBg,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 253, 249, 0.2)',
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16,
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dealCardText,
  },
  badgeContainer: {
    backgroundColor: 'rgba(255, 253, 249, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 253, 249, 0.3)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.dealCardText,
  },
  middleSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  valueContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  heroValue: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.dealCardText,
    letterSpacing: -0.5,
  },
  valueLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 253, 249, 0.8)',
    marginTop: 2,
  },
  sparklineContainer: {
    width: 120,
    alignItems: 'stretch',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 38,
    paddingHorizontal: 4,
  },
  barTrack: {
    width: 12,
    height: '100%',
    backgroundColor: 'rgba(255, 253, 249, 0.25)',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dateText: {
    fontSize: 9,
    fontWeight: '500',
    color: 'rgba(255, 253, 249, 0.7)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 253, 249, 0.25)',
    marginVertical: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.dealCardText,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 253, 249, 0.8)',
    marginTop: 1,
  },
  metricSeparator: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255, 253, 249, 0.25)',
  },
});
