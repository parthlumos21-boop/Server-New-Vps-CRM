import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../../src/api/client';
import { AppHeader } from '../../../src/components/ui/AppHeader';
import { EditableDetailRow } from '../../../src/components/ui/EditableDetailRow';
import { colors } from '../../../src/theme/colors';

export default function QuotationDetailsScreen() {
  const { id, fromSearch } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await apiClient.get(`/quotations/${id}`);
        if (res.data?.success) {
          setData(res.data.data);
        }
      } catch (error) {
        console.log('Error fetching quotation details:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchDetails();
  }, [id]);

  const handleFieldSave = async (fieldKey: string, newValue: string) => {
    try {
      const res = await apiClient.put(`/quotations/${id}`, { [fieldKey]: newValue });
      if (res.data?.success) {
        setData((prev: any) => ({ ...prev, [fieldKey]: newValue }));
      }
    } catch (error: any) {
      console.log('Error updating quotation field:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update field');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <AppHeader title="Quotation Details" showBack onBack={() => fromSearch === 'true' && router.canGoBack() ? router.back() : router.push('/(tabs)/quotations')} />
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centerContainer}>
        <AppHeader title="Quotation Details" showBack onBack={() => fromSearch === 'true' && router.canGoBack() ? router.back() : router.push('/(tabs)/quotations')} />
        <View style={styles.loaderContainer}>
          <Text style={styles.errorText}>Quotation not found.</Text>
        </View>
      </View>
    );
  }

  const sections = [
    {
      title: 'Quotation details',
      data: [
        { label: 'Quotation Number', value: data.quotationNo || data.quotationNumber || data.id || '-' },
        { label: 'Quotation Owner', value: data.quotationOwner || data.ownerUserId || '-', fieldKey: data.quotationOwner !== undefined ? 'quotationOwner' : 'ownerUserId' },
        { label: 'Quotation Date', value: (data.quotationDate || data.createdAt) ? new Date(data.quotationDate || data.createdAt).toLocaleDateString() : '-', fieldKey: data.quotationDate !== undefined ? 'quotationDate' : 'createdAt', fieldType: 'date' as const },
        { label: 'Company Name', value: data.companyName || data.customerName || '-', fieldKey: data.companyName !== undefined ? 'companyName' : 'customerName' },
        { label: 'Project Name', value: data.projectName || data.project || '-', fieldKey: data.projectName !== undefined ? 'projectName' : 'project' }
      ]
    },
    {
      title: 'Status',
      data: [
        { label: 'Status', value: data.status || '-', fieldKey: 'status' },
      ]
    },
    {
      title: 'Commercial',
      data: [
        { label: 'Amount', value: data.amount ? `₹${data.amount.toLocaleString()}` : data.total ? `₹${data.total.toLocaleString()}` : '-' },
      ]
    }
  ];

  const getStatusColor = (value: string) => {
    const lowerValue = value?.toString().toLowerCase();
    if (lowerValue === 'pending') return colors.warning || '#F59E0B';
    if (lowerValue === 'converted' || lowerValue === 'approved') return colors.success || '#16A34A';
    return '#2d3748';
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <AppHeader title={`Quotation - ${data.quotationNo || data.quotationNumber || data.id || ''}`} showBack onBack={() => fromSearch === 'true' && router.canGoBack() ? router.back() : router.push('/(tabs)/quotations')} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {sections.map((section, sIdx) => (
            <View key={sIdx} style={[styles.card, sIdx < sections.length - 1 ? { marginBottom: 16 } : undefined]}>
              <Text style={styles.cardTitle}>{section.title}</Text>
              <View style={styles.divider} />
              
              {section.data.map((field: any, idx) => {
                const isStatusSection = section.title === 'Status';
                const isPrimarySection = section.title.toLowerCase().includes('details');
                const valueStyle = isStatusSection 
                  ? [styles.value, { color: getStatusColor(field.value as string) }]
                  : styles.value;
                  
                const rowStyle = isPrimarySection 
                  ? [styles.row, { flexDirection: 'column', alignItems: 'flex-start' }, idx === section.data.length - 1 ? { borderBottomWidth: 0, paddingBottom: 0 } : undefined]
                  : [styles.row, idx === section.data.length - 1 ? { borderBottomWidth: 0, paddingBottom: 0 } : undefined];
                  
                const labelStyle = isPrimarySection
                  ? [styles.label, { marginBottom: 4 }]
                  : styles.label;

                return (
                  <EditableDetailRow
                    key={idx}
                    label={field.label}
                    value={field.value}
                    fieldKey={field.fieldKey}
                    fieldType={field.fieldType}
                    onSave={handleFieldSave}
                    isEditable={!!field.fieldKey}
                    isStatusSection={isStatusSection}
                    valueStyle={valueStyle}
                    rowStyle={rowStyle}
                    labelStyle={labelStyle}
                  />
                );
              })}
            </View>
          ))}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#718096',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#edf2f7',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f7fafc',
  },
  label: {
    flex: 1,
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  value: {
    flex: 1.5,
    fontSize: 14,
    color: '#2d3748',
    fontWeight: '600',
  }
});
