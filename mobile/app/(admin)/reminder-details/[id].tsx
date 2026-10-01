import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import apiClient from '../../../src/api/client';
import { AppHeader } from '../../../src/components/ui/AppHeader';
import { colors } from '../../../src/theme/colors';
import { getCrmOwnerCode, getCrmOwnerDisplay } from '../../../src/utils/crmUserDirectory';
import { buildUserLookupMap } from '../../../src/utils/customerNormalizer';

export default function TaskDetailsScreen() {
  const { id, fromSearch } = useLocalSearchParams();
  const [data, setData] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [account, setAccount] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const [res, usersRes, leadsRes] = await Promise.all([
          apiClient.get(`/reminders/${id}`),
          apiClient.get('/users/directory').catch(() => ({ data: { success: false, data: [] } })),
          apiClient.get('/leads').catch(() => ({ data: { success: false, data: [] } }))
        ]);

        let fetchedReminder = null;
        if (res.data?.success) {
          fetchedReminder = res.data.data;
          setData(fetchedReminder);
        }

        if (usersRes.data?.success) {
          setUsers(usersRes.data.data || []);
        }

        if (leadsRes.data?.success && fetchedReminder?.relatedEntityId) {
          const leads = leadsRes.data.data || [];
          const match = leads.find((l: any) => (l.id || l._id) === fetchedReminder.relatedEntityId);
          if (match) setAccount(match);
        }

      } catch (error) {
        console.log('Error fetching task details:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchDetails();
  }, [id]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <AppHeader title="Reminder Details" showBack onBack={() => fromSearch === 'true' && router.canGoBack() ? router.back() : router.push('/(admin)/reminders')} />
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centerContainer}>
        <AppHeader title="Reminder Details" showBack onBack={() => fromSearch === 'true' && router.canGoBack() ? router.back() : router.push('/(admin)/reminders')} />
        <View style={styles.loaderContainer}>
          <Text style={styles.errorText}>Task not found.</Text>
        </View>
      </View>
    );
  }

  const dataPayload = data.data && typeof data.data === 'object' ? data.data : {};
  const mergedData = { ...data, ...dataPayload };

  const rawAssignee = mergedData.assignedTo || mergedData.assignedToName || mergedData.ownerUserId || mergedData.createdBy;
  const userMap = buildUserLookupMap(users);
  const key = String(rawAssignee || '').trim().toLowerCase();
  const emailPrefix = key.includes('@') ? key.split('@')[0] : key;

  const assignedName = 
    userMap.get(key) || 
    userMap.get(emailPrefix) || 
    userMap.get(String(rawAssignee)) || 
    getCrmOwnerDisplay(rawAssignee) || 
    getCrmOwnerDisplay(emailPrefix) || 
    mergedData.assignedToName || 
    (rawAssignee ? String(rawAssignee) : '-');
  
  const rawOwner = account?.accountOwner || account?.ownerName || '';
  const ownerCode = getCrmOwnerCode(rawOwner) || account?.accountOwnerCode || '-';

  const fields = [
    { label: 'Title', value: mergedData.title || mergedData.taskName || 'Unknown' },
    { label: 'Status', value: mergedData.status || '-' },
    { label: 'Due Date', value: (mergedData.reminderDate || mergedData.dueDate) ? new Date(mergedData.reminderDate || mergedData.dueDate).toLocaleDateString() : '-' },
    { label: 'Description', value: mergedData.description || '-' },
    { label: 'Assigned To', value: assignedName },
    { label: 'Account', value: ownerCode !== '-' ? ownerCode : (account?.accountName || account?.name || account?.companyName || '-') }
  ];

  return (
    <View style={styles.container}>
      <AppHeader title={data.title || data.taskName || "Reminder Details"} showBack onBack={() => fromSearch === 'true' && router.canGoBack() ? router.back() : router.push('/(admin)/reminders')} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Information</Text>
          <View style={styles.divider} />
          
          {fields.map((field, idx) => (
            <View key={idx} style={styles.row}>
              <Text style={styles.label}>{field.label}</Text>
              <Text style={styles.value}>{field.value}</Text>
            </View>
          ))}
          
        </View>
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
  }
});
