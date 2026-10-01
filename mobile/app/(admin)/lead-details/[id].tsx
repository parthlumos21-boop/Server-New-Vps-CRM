import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../../src/api/client';
import { AppHeader } from '../../../src/components/ui/AppHeader';
import { EditableDetailRow } from '../../../src/components/ui/EditableDetailRow';
import { colors } from '../../../src/theme/colors';

export default function LeadDetailsScreen() {
  const { id, fromSearch } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await apiClient.get(`/leads/${id}`);
        if (res.data?.success) {
          setData(res.data.data);
        }
      } catch (error: any) {
        console.log(`[API Error] GET /leads/${id} - Status: ${error?.response?.status}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchDetails();
    }
  }, [id]);

  const handleFieldSave = async (fieldKey: string, newValue: string) => {
    try {
      const res = await apiClient.put(`/leads/${id}`, { [fieldKey]: newValue });
      if (res.data?.success) {
        setData((prev: any) => ({ ...prev, [fieldKey]: newValue }));
      }
    } catch (error: any) {
      console.log('Error updating field:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update field');
    }
  };

  const handleConvertDeal = () => {
    Alert.alert(
      'Convert to Deal',
      'Are you sure you want to convert this Account to a Deal?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Convert', 
          style: 'default',
          onPress: async () => {
            try {
              setIsLoading(true);
              const res = await apiClient.post(`/leads/${id}/convert-to-deal`);
              if (res.data?.success || res.status === 200 || res.status === 201) {
                Alert.alert('Success', 'Account successfully converted to a Deal!', [
                  { text: 'OK', onPress: () => router.push('/(admin)/deals') }
                ]);
              }
            } catch (error: any) {
              console.log('Error converting deal:', error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to convert to Deal');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleBack = () => {
    if (fromSearch === 'true' && router.canGoBack()) {
      router.back();
    } else {
      router.push('/(admin)/leads');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <AppHeader title="Account Details" showBack onBack={handleBack} />
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centerContainer}>
        <AppHeader title="Account Details" showBack onBack={handleBack} />
        <View style={styles.loaderContainer}>
          <Text style={styles.errorText}>Account not found.</Text>
        </View>
      </View>
    );
  }

  // Grouped Fields
  const sections = [
    {
      title: 'Account details',
      data: [
        { label: 'Account No.', value: data.accountNo || data.leadNo || data.id || '-' },
        { label: 'Account Name', value: data.accountName || data.name || data.companyName || '-', fieldKey: data.accountName !== undefined ? 'accountName' : (data.name !== undefined ? 'name' : 'companyName') },
        { label: 'Project Name', value: data.projectName || data.project || '-', fieldKey: data.projectName !== undefined ? 'projectName' : 'project' },
        { label: 'Account Owner', value: data.accountOwner || data.ownerUserId || '-', fieldKey: data.accountOwner !== undefined ? 'accountOwner' : 'ownerUserId' },
        { label: 'Account Date', value: (data.accountDate || data.createdAt) ? new Date(data.accountDate || data.createdAt).toLocaleDateString() : '-', fieldKey: data.accountDate !== undefined ? 'accountDate' : 'createdAt', fieldType: 'date' as const },
        { label: 'Account Category', value: data.accountCategory || data.category || '-', fieldKey: data.accountCategory !== undefined ? 'accountCategory' : 'category' },
      ]
    },
    {
      title: 'Status',
      data: [
        { label: 'Account Status', value: data.accountStatus || data.status || '-', fieldKey: data.accountStatus !== undefined ? 'accountStatus' : 'status' },
        { label: 'Account State', value: data.accountState || data.state || '-', fieldKey: data.accountState !== undefined ? 'accountState' : 'state' },
      ]
    },
    {
      title: 'Contact',
      data: [
        { label: 'Phone', value: data.phone || '-', fieldKey: 'phone' },
        { label: 'Email', value: data.email || '-', fieldKey: 'email' },
        { label: 'Contact Person', value: data.contactPerson || data.contactName || '-', fieldKey: data.contactPerson !== undefined ? 'contactPerson' : 'contactName' },
      ]
    },
    {
      title: 'Commercial',
      data: [
        { label: 'PO Value', value: data.poValue || '-', fieldKey: 'poValue' },
        { label: 'Job No', value: data.jobNo || '-', fieldKey: 'jobNo' }
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
        <AppHeader title={data.accountName || data.name || "Account Details"} showBack onBack={() => fromSearch === 'true' && router.canGoBack() ? router.back() : router.push('/(admin)/leads')} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {sections.map((section, sIdx) => (
            <View key={sIdx} style={[styles.card, sIdx < sections.length - 1 ? { marginBottom: 16 } : undefined]}>
              <Text style={styles.cardTitle}>{section.title}</Text>
              <View style={styles.divider} />
              
              {section.data.map((field: any, idx) => {
                const isStatusSection = section.title === 'Status';
                const valueStyle = isStatusSection 
                  ? [styles.value, { color: getStatusColor(field.value as string) }]
                  : styles.value;
                  
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
                    rowStyle={idx === section.data.length - 1 ? { borderBottomWidth: 0, paddingBottom: 0 } : undefined}
                  />
                );
              })}
            </View>
          ))}

          {(!data.isConverted && !data.dealId && data.status?.toLowerCase() !== 'converted' && data.accountState?.toLowerCase() !== 'converted') && (
            <TouchableOpacity style={styles.actionBtn} onPress={handleConvertDeal}>
              <Text style={styles.actionBtnText}>Convert Deal</Text>
            </TouchableOpacity>
          )}
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
  },
  actionBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
