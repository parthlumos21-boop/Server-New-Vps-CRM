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
import { StageFilterModal } from '../../src/components/ui/StageFilterModal';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';
import { resolveStage } from '../../src/utils/resolveStage';

const ACCOUNT_STAGES = [
  { label: 'All', value: 'All' },
  { label: 'New', value: 'new' },
  { label: 'Follow Up', value: 'follow_up' },
  { label: 'Technical Offer', value: 'technical_offer' },
  { label: 'Priority 1', value: 'priority_1' },
  { label: 'Commercial Offer', value: 'commercial_offer' },
  { label: 'Priority 2', value: 'priority_2' },
  { label: 'Quotation Sent', value: 'quotation_sent' },
  { label: 'Quote Revision', value: 'quote_revision' },
  { label: 'Order Received', value: 'order_received' },
  { label: 'Convert To PO', value: 'convert_to_po' },
  { label: 'Order Lost', value: 'order_lost' },
  { label: 'Converted', value: 'converted' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Contracted', value: 'contacted' },
  { label: 'Closed', value: 'closed' }
];

export default function LeadsScreen() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [stageFilter, setStageFilter] = useState('All');
  const [tempStageFilter, setTempStageFilter] = useState('All');
  const { user } = useAuth();

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const endpoint = `/leads`;
        
      const res = await apiClient.get(endpoint);
      if (res.data?.success) {
        const allLeads = res.data.data || [];
        const myLeads = allLeads.filter((item: any) => {
          if (!user) return false;
          const userId = user.id;
          const userEmail = user.email?.toLowerCase();
          
          const isCreatorById = item.createdByUserId === userId || item.createdBy === userId;
          const isCreatorByEmail = item.createdUserBy?.toLowerCase() === userEmail;
          const isAssigned = item.assignedTo === userId || item.assignedToUserId === userId;
          const isOwnerById = item.ownerUserId === userId || item.ownerId === userId;
          
          return isCreatorById || isCreatorByEmail || isAssigned || isOwnerById;
        });
        setData(myLeads);
      }
    } catch (error) {
      console.log('Error fetching accounts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const columns = [
    { id: 'accountNo', header: 'Account No.', accessor: (item: any) => item.accountNo || item.leadNo || item.id || '-', width: 100 },
    { id: 'accountName', header: 'Account Name', accessor: (item: any) => item.accountName || item.name || item.companyName || '-', width: 150 },
    { id: 'projectName', header: 'Project Name', accessor: (item: any) => item.projectName || item.project || '-', width: 150 },
    { id: 'accountOwner', header: 'Account Owner', accessor: (item: any) => item.accountOwner || item.ownerUserId || '-', width: 120 },
    { id: 'accountDate', header: 'Account Date', accessor: (item: any) => item.accountDate || item.createdAt ? new Date(item.accountDate || item.createdAt).toLocaleDateString() : '-', width: 100 },
    { id: 'accountCategory', header: 'Account Category', accessor: (item: any) => item.accountCategory || item.category || '-', width: 120 },
    { id: 'accountStatus', header: 'Account Status', accessor: (item: any) => item.accountStatus || item.status || '-', width: 100 },
    { id: 'accountState', header: 'Account State', accessor: (item: any) => item.accountState || item.state || '-', width: 100 },
    { id: 'phone', header: 'Phone', accessor: (item: any) => item.phone || '-', width: 120 },
    { id: 'email', header: 'Email', accessor: (item: any) => item.email || '-', width: 180 },
    { id: 'contactPerson', header: 'Contact Person', accessor: (item: any) => item.contactPerson || item.contactName || '-', width: 120 },
    { id: 'poValue', header: 'PO Value', accessor: (item: any) => item.poValue ? `\u20B9${item.poValue.toLocaleString()}` : '-', width: 100 },
    { id: 'jobNo', header: 'Job No', accessor: (item: any) => item.jobNo || '-', width: 100 }
  ];

  const activeCount = data.filter(d => (d.status || d.accountStatus || '').toLowerCase() === 'active').length;
  const pendingCount = data.filter(d => (d.status || d.accountStatus || '').toLowerCase() === 'pending').length;
  const draftCount = data.filter(d => (d.status || d.accountStatus || '').toLowerCase() === 'draft').length;

  const summaryMetrics = [
    { label: 'Active', value: activeCount },
    { label: 'Pending', value: pendingCount },
    { label: 'Draft', value: draftCount }
  ];

  const filteredData = data.filter(item => {
    if (!searchQuery) {
      return stageFilter === 'All' || resolveStage(item) === stageFilter;
    }
    const searchString = `
      ${item.accountNo || item.leadNo || item.id || ''}
      ${item.accountName || item.name || item.companyName || ''}
      ${item.projectName || item.project || ''}
      ${item.accountOwner || item.ownerUserId || ''}
      ${item.accountDate || item.createdAt || ''}
      ${item.accountCategory || item.category || ''}
      ${item.accountStatus || item.status || ''}
      ${item.accountState || item.state || ''}
      ${item.phone || ''}
      ${item.email || ''}
      ${item.contactPerson || item.contactName || ''}
      ${item.poValue || ''}
      ${item.jobNo || ''}
    `.toLowerCase();
    const matchesSearch = searchString.includes(searchQuery.toLowerCase());
    const matchesStage = stageFilter === 'All' || resolveStage(item) === stageFilter;
    return matchesSearch && matchesStage;
  });

  const handleDelete = (id: string) => {
    setData(prev => prev.filter((d: any) => (d._id || d.id) !== id));
  };

  const renderMobileCard = (item: any) => {
    const itemId = item._id || item.id;
    const accNo = item.accountNo || item.leadNo || item.id || '-';
    const name = item.accountName || item.name || item.companyName || '-';
    const status = item.accountStatus || item.status || '-';
    const project = item.projectName || item.project || '-';
    const owner = item.accountOwner || item.ownerUserId || '-';
    const category = item.accountCategory || item.category || '-';
    const state = item.accountState || item.state || '-';
    const val = item.poValue ? `\u20B9${item.poValue.toLocaleString()}` : '-';

    let statusColor = '#33447D';
    let statusBg = '#E8EBF2';
    const s = status.toLowerCase();
    if (s === 'active') { statusColor = '#38a169'; statusBg = '#f0fff4'; }
    else if (s === 'inactive' || s === 'lost') { statusColor = '#e53e3e'; statusBg = '#fff5f5'; }
    else if (s === 'pending') { statusColor = '#dd6b20'; statusBg = '#feebc8'; }

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardId}>#{accNo}</Text>
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
            <Text style={styles.cardLabel}>Account Owner</Text>
            <Text style={styles.cardValue}>{owner}</Text>
          </View>
          <View style={styles.cardGridItem}>
            <Text style={styles.cardLabel}>Category</Text>
            <Text style={styles.cardValue}>{category}</Text>
          </View>
          <View style={styles.cardGridItem}>
            <Text style={styles.cardLabel}>State</Text>
            <Text style={styles.cardValue}>{state}</Text>
          </View>
          <View style={styles.cardGridItem}>
            <Text style={styles.cardLabel}>PO Value</Text>
            <Text style={styles.cardValue}>{val}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.viewDetailsBtn} onPress={() => router.push(`/lead-details/${item._id || item.id}`)}>
          <Text style={styles.viewDetailsText}>View details</Text>
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
          placeholder="Search accounts..."
        />
      ) : (
        <AppHeader title="Accounts" onSearch={() => setIsSearchVisible(true)} onFilter={() => setIsFilterVisible(true)} />
      )}

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {isSearchVisible ? (
            <ResultsHeader count={filteredData.length} />
          ) : (
            <SummaryWidget
              title="Accounts"
              totalCount={data.length}
              metrics={summaryMetrics}
            />
          )}
          
          {!isSearchVisible && (
            <ListControls />
          )}
          <ResponsiveList
            data={filteredData}
            columns={columns}
            keyExtractor={(item: any) => item._id || item.id}
            onRowPress={(item: any) => router.push(`/lead-details/${item._id || item.id}`)}
            renderMobileCard={renderMobileCard}
          />
          <StageFilterModal
            visible={isFilterVisible}
            value={stageFilter}
            options={ACCOUNT_STAGES}
            onChange={setStageFilter}
            onClose={() => setIsFilterVisible(false)}
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
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 12,
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
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  viewDetailsText: {
    color: '#1650C8',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  }
});
