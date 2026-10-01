import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type SummaryWidgetProps = {
  title: string;
  totalCount: number;
  metrics: { label: string; value: number }[];
};

export const SummaryWidget: React.FC<SummaryWidgetProps> = ({ title, totalCount, metrics }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Total {title}</Text>
        <Text style={styles.totalValue}>{totalCount.toLocaleString()}</Text>
      </View>
      
      {metrics && metrics.length > 0 && (
        <View style={styles.metricsContainer}>
          {metrics.map((metric, index) => (
            <View key={index} style={styles.metricItem}>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Text style={styles.metricValue}>{metric.value.toLocaleString()}</Text>
              {index < metrics.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1650C8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#20242E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 253, 249, 0.2)',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFDF9',
    marginBottom: 8,
  },
  totalContainer: {
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 12,
    color: 'rgba(255, 253, 249, 0.8)',
    marginBottom: 2,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFDF9',
    letterSpacing: -0.5,
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 253, 249, 0.25)',
    paddingTop: 10,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 12,
    color: 'rgba(255, 253, 249, 0.8)',
    marginRight: 6,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFDF9',
  },
  divider: {
    height: 10,
    width: 1,
    backgroundColor: 'rgba(255, 253, 249, 0.3)',
    marginLeft: 10,
  }
});
