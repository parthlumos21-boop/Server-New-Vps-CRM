import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import { AppHeader } from '../../src/components/ui/AppHeader';
import { ResponsiveList } from '../../src/components/ui/ResponsiveList';
import { SummaryWidget } from '../../src/components/ui/SummaryWidget';
import { ListControls } from '../../src/components/ui/ListControls';
import { LoadingSkeleton } from '../../src/components/ui/LoadingSkeleton';
import { InlineSearchBar } from '../../src/components/ui/InlineSearchBar';
import { ResultsHeader } from '../../src/components/ui/ResultsHeader';
import { colors } from '../../src/theme/colors';
import { buildUserLookupMap, normalizeCustomerItem, resetSeenLegacyIds } from '../../src/utils/customerNormalizer';

export default function CustomersScreen() {
  const [data, setData] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      resetSeenLegacyIds();
      const [res, usersRes] = await Promise.all([
        apiClient.get('/customers'),
        apiClient.get('/users/directory').catch(() => ({ data: { success: false, data: [] } }))
      ]);
      const dir = usersRes.data?.success ? (usersRes.data.data || []) : [];
      if (usersRes.data?.success) {
        setUsers(dir);
      }
      if (res.data?.success) {
        const rawList = res.data.data || [];
        const userMap = buildUserLookupMap(dir);
        setData(rawList.map((item: any) => normalizeCustomerItem(item, userMap)));
      }
    } catch (error) {
      console.log('Error fetching customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    { id: 'customerNumber', header: 'Customer Number', accessor: (item: any) => item.displayCustomerNumber || '-', width: 130 },
    { id: 'customerName', header: 'Customer Name', accessor: (item: any) => item.displayName || '-', width: 150 },
    { id: 'addedDate', header: 'Added Date', accessor: (item: any) => item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-', width: 100 },
    { id: 'email', header: 'Email', accessor: (item: any) => item.email || '-', width: 180 },
    { id: 'phone', header: 'Phone', accessor: (item: any) => item.phone || '-', width: 120 },
    { id: 'customerCategory', header: 'Customer Category', accessor: (item: any) => item.customerCategory || item.category || '-', width: 130 },
    { id: 'customerOwner', header: 'Customer Owner', accessor: (item: any) => item.displayCustomerOwner || '-', width: 120 },
    { id: 'customerStatus', header: 'Customer Status', accessor: (item: any) => item.customerStatus || item.status || '-', width: 100 }
  ];

  // Dynamically compute category counts
  const categoryCounts = data.reduce((acc, item) => {
    const cat = item.customerCategory || item.category || 'Unknown';
    if (cat !== 'Unknown') {
      acc[cat] = (acc[cat] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const summaryMetrics = Object.entries(categoryCounts).map(([label, value]) => ({
    label,
    value: value as number
  }));

  const filteredData = data.filter(item => {
    if (!searchQuery) return true;
    const searchString = `
      ${item.displayCustomerNumber || item.customerNo || ''}
      ${item.displayName || item.name || ''}
      ${item.email || ''}
      ${item.phone || ''}
      ${item.createdAt || ''}
      ${item.displayCustomerOwner || item.ownerUserId || ''}
      ${item.customerCategory || item.category || ''}
      ${item.customerStatus || item.status || ''}
      ${item.customerType || item.type || ''}
      ${item.latestRemark || item.remark || ''}
    `.toLowerCase();
    return searchString.includes(searchQuery.toLowerCase());
  });

  const handleDelete = (id: string) => {
    setData(prev => prev.filter((d: any) => (d._id || d.id) !== id));
  };

  const renderMobileCard = (item: any) => {
    const itemId = item._id || item.id;
    const custNo = item.displayCustomerNumber || '-';
    const name = item.displayName || '-';
    const status = item.customerStatus || item.status || '-';
    const category = item.customerCategory || item.category || '-';
    const owner = item.displayCustomerOwner || '-';
    const addedDate = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-';
    const phone = item.phone || '-';
    const email = item.email || '-';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardId}>{custNo}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{status}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(itemId)} style={{ padding: 4, marginLeft: 4 }}>
              <Feather name="trash-2" size={14} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.cardTitle}>{name}</Text>
        
        <View style={styles.cardDivider} />
        
        <View style={styles.cardGrid}>
          <View style={styles.cardGridItem}>
            <Text style={styles.cardLabel}>Category</Text>
            <Text style={styles.cardValue}>{category}</Text>
          </View>
          <View style={styles.cardGridItem}>
            <Text style={styles.cardLabel}>Owner</Text>
            <Text style={styles.cardValue}>{owner}</Text>
          </View>
          <View style={styles.cardGridItem}>
            <Text style={styles.cardLabel}>Added Date</Text>
            <Text style={styles.cardValue}>{addedDate}</Text>
          </View>
        </View>

        <View style={styles.contactInfo}>
          <View style={styles.contactRow}>
            <Feather name="phone" size={14} color="#718096" style={styles.contactIcon} />
            <Text style={styles.contactText}>{phone}</Text>
          </View>
          <View style={styles.contactRow}>
            <Feather name="mail" size={14} color="#718096" style={styles.contactIcon} />
            <Text style={styles.contactText}>{email}</Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.viewDetailsBtn} onPress={() => router.push(`/customer-details/${item.legacyId || item.id || item._id}`)}>
          <Text style={styles.viewDetailsText}>View Details</Text>
          <Feather name="chevron-right" size={16} color="#1650C8" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {isSearchVisible ? (
        <InlineSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClose={() => {
            setIsSearchVisible(false);
            setSearchQuery('');
          }}
          placeholder="Search customers..."
        />
      ) : (
        <AppHeader title="Customers" onSearch={() => setIsSearchVisible(true)} />
      )}
      
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {isSearchVisible ? (
            <ResultsHeader count={filteredData.length} />
          ) : (
            <SummaryWidget 
              title="Customers" 
              totalCount={data.length} 
              metrics={summaryMetrics} 
            />
          )}
          
          {!isSearchVisible && <ListControls />}
          <ResponsiveList
            data={filteredData}
            columns={columns}
            keyExtractor={(item: any) => item._id || item.id}
            onRowPress={(item: any) => router.push(`/customer-details/${item.legacyId || item.id || item._id}`)}
            renderMobileCard={renderMobileCard}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardId: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  statusBadge: {
    backgroundColor: '#E8EBF2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#33447D',
    fontSize: 12,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#edf2f7',
    marginVertical: 12,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardGridItem: {
    width: '50%',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 13,
    color: '#2d3748',
    fontWeight: '500',
  },
  contactInfo: {
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  contactIcon: {
    marginRight: 8,
    width: 16,
  },
  contactText: {
    fontSize: 13,
    color: '#4a5568',
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  viewDetailsText: {
    color: '#1650C8',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  }
});
