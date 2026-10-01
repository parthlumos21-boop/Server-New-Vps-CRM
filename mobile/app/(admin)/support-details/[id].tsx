import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../../src/api/client';
import { AppHeader } from '../../../src/components/ui/AppHeader';
import { useAuth } from '../../../src/context/AuthContext';
import { colors } from '../../../src/theme/colors';

export default function SupportDetailsScreen() {
  const { id, fromSearch } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  
  const isSupportUser = user?.email?.endsWith('@support.com');

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await apiClient.get(`/support-requests/${id}`);
        if (res.data?.success) {
          setData(res.data.data);
        }
      } catch (error) {
        console.log('Error fetching support details:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchDetails();
  }, [id]);

  const handleCloseRequest = () => {
    Alert.alert(
      'Close Request',
      'Are you sure you want to close this request?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Close', 
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.post(`/support-requests/${id}/close`);
              if (fromSearch === 'true' && router.canGoBack()) {
                router.back();
              } else {
                router.push('/(admin)/support');
              }
            } catch (error) {
              console.log('Error closing request:', error);
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <AppHeader title="Support Request" showBack onBack={() => fromSearch === 'true' && router.canGoBack() ? router.back() : router.push('/(admin)/support')} />
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centerContainer}>
        <AppHeader title="Support Request" showBack onBack={() => fromSearch === 'true' && router.canGoBack() ? router.back() : router.push('/(admin)/support')} />
        <View style={styles.loaderContainer}>
          <Text style={styles.errorText}>Request not found.</Text>
        </View>
      </View>
    );
  }

  const closedOn = data.closedAt || data.data?.closedAt || (data.status?.toLowerCase() === 'closed' && data.updatedAt)
    ? new Date(data.closedAt || data.data?.closedAt || data.updatedAt).toLocaleDateString()
    : '-'
  const closedBy = data.closedBy || data.data?.closedBy || (data.status?.toLowerCase() === 'closed' ? (data.updatedBy || '-') : '-')
  const ownerName = data.ownerName || data.data?.ownerName || data.ownerUserId || data.assignedTo || '-'

  const sections = [
    {
      title: 'Support details',
      data: [
        { label: 'SR Number', value: data.srNumber || data.ticketNo || data.legacyId || '-' },
        { label: 'Customer Name', value: data.customerName || 'Unknown' },
        { label: 'Service Type', value: data.serviceType || '-' },
        { label: 'Service/Request Date', value: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : '-' },
        { label: 'Owner', value: ownerName },
      ]
    },
    {
      title: 'Status',
      data: [
        { label: 'Status', value: data.status || '-' },
        { label: 'Closed On', value: closedOn },
        { label: 'Closed By', value: closedBy },
        { label: 'Last Updated', value: data.updatedAt ? new Date(data.updatedAt).toLocaleDateString() : '-' }
      ]
    }
  ];

  const getStatusColor = (value: string) => {
    const lowerValue = value?.toString().toLowerCase();
    if (lowerValue === 'pending' || lowerValue === 'open') return colors.warning || '#F59E0B';
    if (lowerValue === 'resolved' || lowerValue === 'closed' || lowerValue === 'converted') return colors.success || '#16A34A';
    return '#2d3748';
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <AppHeader title="Support Request" showBack onBack={() => fromSearch === 'true' && router.canGoBack() ? router.back() : router.push('/(admin)/support')} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {sections.map((section, sIdx) => (
          <View key={sIdx} style={[styles.card, sIdx < sections.length - 1 && { marginBottom: 16 }]}>
            <Text style={styles.cardTitle}>{section.title}</Text>
            <View style={styles.divider} />
            
            {section.data.map((field, idx) => {
              const isStatusSection = section.title === 'Status';
              const isPrimarySection = section.title.toLowerCase().includes('details');
              const valueStyle = isStatusSection && (field.label === 'Status' || field.label === 'Customer Status' || field.label === 'Account Status')
                ? [styles.value, { color: getStatusColor(field.value) }]
                : styles.value;
                
              const rowStyle = isPrimarySection 
                ? [styles.row, { flexDirection: 'column', alignItems: 'flex-start' }, idx === section.data.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 }]
                : [styles.row, idx === section.data.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 }];
                
              const labelStyle = isPrimarySection
                ? [styles.label, { marginBottom: 4 }]
                : styles.label;

              return (
                <View key={idx} style={rowStyle as any}>
                  <Text style={labelStyle}>{field.label}</Text>
                  <Text style={valueStyle}>{field.value}</Text>
                </View>
              );
            })}
          </View>
        ))}
        
        {isSupportUser && (data.status?.toLowerCase() !== 'closed' && data.status?.toLowerCase() !== 'resolved') && (
          <TouchableOpacity style={styles.closeBtn} onPress={handleCloseRequest}>
            <Text style={styles.closeBtnText}>Close Request</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
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
  closeBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
