import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, BackHandler, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../../src/api/client';
import { AppHeader } from '../../../src/components/ui/AppHeader';
import { EditableDetailRow } from '../../../src/components/ui/EditableDetailRow';
import { colors } from '../../../src/theme/colors';

import { buildUserLookupMap, normalizeCustomerItem } from '../../../src/utils/customerNormalizer';

const formatCustomerNumber = (num: string) => {
  if (!num || num === '-') return '-';
  if (num.startsWith('SSC')) return num;
  
  const match = num.match(/\d+/);
  if (match) {
    const digits = match[0].padStart(6, '0');
    return `SSC${digits}`;
  }
  return num;
};

export default function CustomerDetailsScreen() {
  const { id, fromSearch } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const [res, usersRes] = await Promise.all([
          apiClient.get(`/customers/${id}`),
          apiClient.get('/users/directory').catch(() => ({ data: { success: false, data: [] } }))
        ]);
        const dir = usersRes.data?.success ? (usersRes.data.data || []) : [];
        if (usersRes.data?.success) {
          setUsers(dir);
        }
        if (res.data?.success && res.data.data) {
          const userMap = buildUserLookupMap(dir);
          setData(normalizeCustomerItem(res.data.data, userMap));
        }
      } catch (error) {
        console.error('Error fetching customer details:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchCustomer();
  }, [id]);

  const handleFieldSave = async (fieldKey: string, newValue: string) => {
    try {
      const res = await apiClient.put(`/customers/${id}`, { [fieldKey]: newValue });
      if (res.data?.success) {
        setData((prev: any) => ({ ...prev, [fieldKey]: newValue }));
      }
    } catch (error: any) {
      console.error('Error updating customer field:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update field');
    }
  };

  const handleBack = () => {
    if (fromSearch === 'true' && router.canGoBack()) {
      router.back();
    } else {
      router.push('/(admin)/customers');
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true; // Prevent default back behavior
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => {
      subscription.remove();
    };
  }, [fromSearch]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <AppHeader title="Customer Details" showBack onBack={handleBack} />
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centerContainer}>
        <AppHeader title="Customer Details" showBack onBack={handleBack} />
        <View style={styles.loaderContainer}>
          <Text style={styles.errorText}>Customer not found.</Text>
        </View>
      </View>
    );
  }

  const sections = [
    {
      title: 'Customer details',
      data: [
        { label: 'Customer Number', value: formatCustomerNumber(data.displayCustomerNumber || data.customerNo || data.id) || '-' },
        { label: 'Customer Name', value: data.customerName || data.name || data.displayName || '-', fieldKey: data.customerName !== undefined ? 'customerName' : 'name' },
        { label: 'Customer Owner', value: data.displayCustomerOwner || '-' },
        { label: 'Customer Category', value: data.customerCategory || data.category || '-', fieldKey: data.customerCategory !== undefined ? 'customerCategory' : 'category' },
        { label: 'Added Date', value: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : '-' },
      ]
    },
    {
      title: 'Status',
      data: [
        { label: 'Customer Status', value: data.customerStatus || data.status || '-', fieldKey: data.customerStatus !== undefined ? 'customerStatus' : 'status' }
      ]
    },
    {
      title: 'Contact',
      data: [
        { label: 'Phone', value: data.phone || '-', fieldKey: 'phone' },
        { label: 'Email', value: data.email || '-', fieldKey: 'email' },
      ]
    }
  ];

  const getStatusColor = (value: string) => {
    const lowerValue = value?.toString().toLowerCase();
    if (lowerValue === 'pending') return colors.warning || '#F59E0B';
    if (lowerValue === 'converted') return colors.success || '#16A34A';
    return '#2d3748';
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <AppHeader title={data.customerName || data.name || data.displayName || "Customer Details"} showBack onBack={handleBack} />
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
