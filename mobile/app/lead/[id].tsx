import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import apiClient from '../../src/api/client';

export default function LeadDetailScreen() {
  const { id } = useLocalSearchParams();
  const [lead, setLead] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const response = await apiClient.get(`/deals/${id}`);
        if (response.data?.success) {
          setLead(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching lead details:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchLead();
  }, [id]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#33447D" />
      </View>
    );
  }

  if (!lead) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Lead not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{lead.title || 'Untitled Deal'}</Text>
        
        <View style={styles.row}>
          <Text style={styles.label}>Value:</Text>
          <Text style={styles.value}>${lead.value || 0}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>Stage:</Text>
          <Text style={styles.value}>{lead.stage || 'New'}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>Company:</Text>
          <Text style={styles.value}>{lead.company_name || 'N/A'}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>Close Date:</Text>
          <Text style={styles.value}>{lead.expected_close_date ? new Date(lead.expected_close_date).toLocaleDateString() : 'N/A'}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  label: {
    width: 90,
    fontSize: 16,
    fontWeight: '600',
    color: '#4a5568',
  },
  value: {
    flex: 1,
    fontSize: 16,
    color: '#2d3748',
  },
  errorText: {
    fontSize: 16,
    color: '#e53e3e',
  }
});
