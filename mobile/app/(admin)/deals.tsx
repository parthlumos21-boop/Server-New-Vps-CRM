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
import { formatDealNo } from '../../src/utils/formatters';

export default function DealsScreen() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/deals');
      if (res.data?.success) {
        setData(res.data.data || []);
      }
    } catch (error) {
      console.log('Error fetching deals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    { id: 'dealNo', header: 'Deal No', accessor: (item: any) => formatDealNo(item.dealNo || item.id), width: 100 },
    { id: 'dealName', header: 'Deal Name', accessor: (item: any) => item.dealName || item.name || '-', width: 150 },
    { id: 'dealDate', header: 'Deal Date', accessor: (item: any) => item.dealDate || item.createdAt ? new Date(item.dealDate || item.createdAt).toLocaleDateString() : '-', width: 100 },
    { id: 'dealOwner', header: 'Deal Owner', accessor: (item: any) => item.dealOwner || item.ownerUserId || '-', width: 120 },
    { id: 'dealType', header: 'Deal Type', accessor: (item: any) => item.dealType || item.type || '-', width: 120 },
    { id: 'dealStatus', header: 'Deal Status', accessor: (item: any) => item.dealStatus || item.status || '-', width: 100 },
    { id: 'projectName', header: 'Project Name', accessor: (item: any) => item.projectName || item.project || '-', width: 150 },
    { id: 'dealValue', header: 'Deal Value', accessor: (item: any) => item.dealValue ? `₹${item.dealValue.toLocaleString()}` : '-', width: 100 },
    { id: 'convertPo', header: 'Convert PO', accessor: (item: any) => item.convertPo ? 'Yes' : 'No', width: 100 },
    { id: 'poValue', header: 'PO Value', accessor: (item: any) => item.poValue ? `₹${item.poValue.toLocaleString()}` : '-', width: 100 },
    { id: 'jobNo', header: 'Job No.', accessor: (item: any) => item.jobNo || '-', width: 100 },
    { id: 'lostOrderReason', header: 'Lost Order Reason', accessor: (item: any) => item.lostOrderReason || '-', width: 150 }
  ];

  const openCount = data.filter(d => (d.status || d.dealStatus || '').toLowerCase() === 'open').length;
  const wonCount = data.filter(d => (d.status || d.dealStatus || '').toLowerCase() === 'won').length;
  const lostCount = data.filter(d => (d.status || d.dealStatus || '').toLowerCase() === 'lost').length;
  const convertedCount = data.filter(d => d.convertPo === true).length;

  const summaryMetrics = [
    { label: 'Open', value: openCount },
    { label: 'Won', value: wonCount },
    { label: 'Lost', value: lostCount },
    { label: 'Converted', value: convertedCount }
  ];

  const filteredData = data.filter(item => {
    if (!searchQuery) return true;
    const searchString = `
      ${item.dealNo || ''}
      ${item.id || ''}
      ${item.dealName || ''}
      ${item.name || ''}
      ${item.dealDate || ''}
      ${item.createdAt || ''}
      ${item.dealOwner || ''}
      ${item.ownerUserId || ''}
      ${item.dealType || ''}
      ${item.type || ''}
      ${item.dealStatus || ''}
      ${item.status || ''}
      ${item.projectName || ''}
      ${item.project || ''}
      ${item.dealValue || ''}
      ${item.poValue || ''}
      ${item.jobNo || ''}
      ${item.lostOrderReason || ''}
    `.toLowerCase();
    return searchString.includes(searchQuery.toLowerCase());
  });

  const handleDelete = (id: string) => {
    setData(prev => prev.filter((d: any) => (d._id || d.id) !== id));
  };

  const renderMobileCard = (item: any) => {
    const itemId = item._id || item.id;
    const dealNo = formatDealNo(item.dealNo || item.id);
    const name = item.dealName || item.name || '-';
    const status = item.dealStatus || item.status || '-';
    const project = item.projectName || item.project || '-';
    const owner = item.dealOwner || item.ownerUserId || '-';
    const dealType = item.dealType || item.type || '-';
    const date = item.dealDate || item.createdAt ? new Date(item.dealDate || item.createdAt).toLocaleDateString() : '-';
    const dealVal = item.dealValue ? `₹${item.dealValue.toLocaleString()}` : '-';
    const poVal = item.poValue ? `₹${item.poValue.toLocaleString()}` : '-';
    const convertPo = item.convertPo ? '✓ Yes' : 'No';
    const jobNo = item.jobNo || '-';
    
    // Status color
    let statusColor = '#33447D';
    let statusBg = '#E8EBF2';
    const s = status.toLowerCase();
    if (s === 'won') { statusColor = '#38a169'; statusBg = '#f0fff4'; }
    else if (s === 'lost') { statusColor = '#e53e3e'; statusBg = '#fff5f5'; }

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardId}>{dealNo}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.statusBadge, { backgroundColor: statusBg, marginRight: 8 }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(itemId)} style={{ padding: 4 }}>
              <Feather name="trash-2" size={14} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.cardTitle}>{name}</Text>
        <Text style={styles.cardSubtitle}>{project}</Text>
        
        <View style={styles.cardDivider} />
        
        <View style={styles.cardGrid}>
          <View style={styles.cardGridItem}>
            <Text style={styles.cardLabel}>Owner</Text>
            <Text style={styles.cardValue}>{owner}</Text>
          </View>
          <View style={styles.cardGridItem}>
            <Text style={styles.cardLabel}>Deal Type</Text>
            <Text style={styles.cardValue}>{dealType}</Text>
          </View>
          <View style={styles.cardGridItem}>
            <Text style={styles.cardLabel}>Deal Date</Text>
            <Text style={styles.cardValue}>{date}</Text>
          </View>
          <View style={styles.cardGridItem}>
            <Text style={styles.cardLabel}>Deal Value</Text>
            <Text style={styles.cardValue}>{dealVal}</Text>
          </View>
        </View>

        <View style={styles.poInfo}>
          <View style={styles.poRow}>
            <Text style={styles.poLabel}>Convert PO:</Text>
            <Text style={styles.poValue}>{convertPo}</Text>
          </View>
          <View style={styles.poRow}>
            <Text style={styles.poLabel}>PO Value:</Text>
            <Text style={styles.poValue}>{poVal}</Text>
          </View>
          <View style={styles.poRow}>
            <Text style={styles.poLabel}>Job No:</Text>
            <Text style={styles.poValue}>{jobNo}</Text>
          </View>
          {s === 'lost' && (
            <View style={[styles.poRow, { marginTop: 4 }]}>
              <Text style={[styles.poLabel, { color: '#e53e3e' }]}>Reason:</Text>
              <Text style={[styles.poValue, { color: '#e53e3e' }]}>{item.lostOrderReason || '-'}</Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity style={styles.viewDetailsBtn} onPress={() => router.push(`/deal-details/${item._id || item.id}`)}>
          <Text style={styles.viewDetailsText}>View Deal</Text>
          <Feather name="chevron-right" size={16} color="#33447D" />
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
          placeholder="Search deals..."
        />
      ) : (
        <AppHeader title="Deals" onSearch={() => setIsSearchVisible(true)} />
      )}
      
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {isSearchVisible ? (
            <ResultsHeader count={filteredData.length} />
          ) : (
            <SummaryWidget 
              title="Deals" 
              totalCount={data.length} 
              metrics={summaryMetrics} 
            />
          )}
          
          {!isSearchVisible && (
            <ListControls 
              onAddPress={() => router.push('/deals/new')} 
              addLabel="Add Deal" 
              variant="slider"
            />
          )}
          <ResponsiveList
            data={filteredData}
            columns={columns}
            keyExtractor={(item: any) => item._id || item.id}
            onRowPress={(item: any) => router.push(`/deal-details/${item._id || item.id}`)}
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
    backgroundColor: colors.background,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#4a5568',
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
  poInfo: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  poRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  poLabel: {
    fontSize: 13,
    color: '#4a5568',
  },
  poValue: {
    fontSize: 13,
    color: '#2d3748',
    fontWeight: '600',
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  viewDetailsText: {
    color: '#33447D',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  }
});
