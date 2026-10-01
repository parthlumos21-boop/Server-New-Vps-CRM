import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, TextInput } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BackHandler } from 'react-native';
import apiClient from '../../src/api/client';
import { AppHeader } from '../../src/components/ui/AppHeader';
import { LoadingSkeleton } from '../../src/components/ui/LoadingSkeleton';
import { CalendarButton } from '../../src/components/reminders/CalendarButton';
import { CalendarModal } from '../../src/components/calendar/CalendarModal';
import { TimelineReminderList } from '../../src/components/reminders/timeline/TimelineReminderList';
import { isSameDay } from 'date-fns';
import { SelectField } from '../../src/components/accounts/SelectField';
import { ReminderDateSelector } from '../../src/components/reminders/ReminderDateSelector';
import { SearchModal } from '../../src/components/ui/SearchModal';
import { colors } from '../../src/theme/colors';

export default function TasksScreen() {
  const [data, setData] = useState<any[]>([]);
  const [accountMap, setAccountMap] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const params = useLocalSearchParams();
  const { from } = params;

  useEffect(() => {
    if (params.date && typeof params.date === 'string') {
      setSelectedDate(new Date(params.date));
    }
  }, [params.date]);

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const [res, leadsRes] = await Promise.all([
        apiClient.get('/reminders'),
        apiClient.get('/leads')
      ]);

      if (leadsRes.data?.success) {
        const leads = leadsRes.data.data || [];
        setAccounts(leads);
        const map: Record<string, any> = {};
        leads.forEach((l: any) => {
          map[l._id || l.id] = l;
        });
        setAccountMap(map);
      }

      if (res.data?.success) {
        setData(res.data.data || []);
      }
    } catch (error) {
      console.log('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchData(true);
    }, [])
  );

  useEffect(() => {
    if (from === 'more') {
      const onBackPress = () => {
        router.push('/(tabs)/more' as any);
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }
  }, [from]);

  const filteredData = data.filter(item => {
    const searchString = `${item.title} ${item.taskName}`.toLowerCase();
    const matchesSearch = searchString.includes(searchQuery.toLowerCase());
    
    let matchesDate = true;
    if (selectedDate && selectedDate.getTime() !== 0) {
      const dateStr = item.reminderDate || item.dueDate || item.remindAt;
      if (dateStr) {
        matchesDate = isSameDay(new Date(dateStr), selectedDate);
      } else {
        matchesDate = false;
      }
    }
    
    let matchesAccount = true;
    if (selectedAccountId) {
      matchesAccount = item.relatedEntityId === selectedAccountId;
    }
    
    return matchesSearch && matchesDate && matchesAccount;
  });

  const accountOptions = Array.from(new Set(accounts.map(a => a.accountName || a.name || a.companyName || a.id).filter(Boolean)));
  accountOptions.unshift('All Accounts');
  
  const selectedAccount = accounts.find(a => a.id === selectedAccountId || a._id === selectedAccountId);
  const selectedAccountLabel = selectedAccount ? (selectedAccount.accountName || selectedAccount.name || selectedAccount.companyName || selectedAccount.id) : 'All Accounts';

  const handleAccountSelect = (name: string) => {
    if (name === 'All Accounts') {
      setSelectedAccountId('');
      return;
    }
    const acc = accounts.find(a => (a.accountName || a.name || a.companyName || a.id) === name);
    if (acc) {
      setSelectedAccountId(acc.id || acc._id);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader 
        title="Reminders" 
        onSearch={() => setIsSearchVisible(true)}
        showBack={from === 'more'}
        onBack={() => {
          if (from === 'more') {
            router.push('/(tabs)/more' as any);
          }
        }}
        rightContent={
          <TouchableOpacity onPress={() => setIsCalendarVisible(true)} style={{ marginLeft: 8 }}>
            <Feather name="calendar" size={20} color={colors.primary} />
          </TouchableOpacity>
        }
      />
      
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <>
          <View style={styles.controlsContainer}>
            <ReminderDateSelector 
              selectedDate={selectedDate} 
              onDateChange={setSelectedDate} 
            />
            
            <View style={styles.actionsContainer}>
              <View style={styles.accountFilterWrapper}>
                <SelectField 
                  label=""
                  value={selectedAccountLabel} 
                  options={accountOptions} 
                  onChange={handleAccountSelect}
                  renderTrigger={(onPress, value) => (
                    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
                      <Text style={styles.actionLabel}>Filter: </Text>
                      <Text style={styles.actionValue} numberOfLines={1}>{value}</Text>
                      <Feather name="chevron-down" size={16} color="#718096" />
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </View>
          
          <TimelineReminderList
            data={filteredData}
            accountMap={accountMap}
            onRowPress={(item: any) => router.push(`/reminder-details/${item._id || item.id}`)}
          />
          
          {filteredData.length === 0 && (
            <View style={styles.emptyStateContainer}>
              <Feather name="calendar" size={48} color="#DCDCDC" />
              <Text style={styles.emptyStateText}>
                No reminders found
              </Text>
            </View>
          )}
        </>
      )}

      <CalendarModal
        visible={isCalendarVisible}
        onClose={() => setIsCalendarVisible(false)}
        selectedDate={selectedDate}
        onSelectDate={(date) => {
          setSelectedDate(date);
          setIsCalendarVisible(false);
        }}
        reminders={data}
      />

      <SearchModal
        visible={isSearchVisible}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClose={() => setIsSearchVisible(false)}
        placeholder="Search reminders..."
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/reminders/new')}>
        <Feather name="plus" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  controlsContainer: {
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E2E2',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  accountFilterWrapper: {
    flex: 1,
    // Adjust bottom margin from SelectField container
    marginBottom: -14, 
  },
  actionButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  actionLabel: {
    fontSize: 13,
    color: '#718096',
  },
  actionValue: {
    fontSize: 13,
    color: '#2d3748',
    fontWeight: '600',
    marginRight: 4,
    maxWidth: 70,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 100,
  }
});
