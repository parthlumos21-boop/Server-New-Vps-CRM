import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Image, Modal, TouchableOpacity, Pressable, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import { useAuth } from '../../src/context/AuthContext';
import { useSocket } from '../../src/context/SocketContext';
import { colors } from '../../src/theme/colors';
import { spacing, shadows } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';
import { StatCard } from '../../src/components/StatCard';
import { ActivityItem } from '../../src/components/ActivityItem';
import { QuickAction } from '../../src/components/QuickAction';
import { SearchBar } from '../../src/components/SearchBar';
import { ReminderDateSelector } from '../../src/components/reminders/ReminderDateSelector';
import { DealsHeroCard, DealItem } from '../../src/components/deals/DealsHeroCard';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';

interface DashboardMetrics {
  leads: number | string;
  deals: number | string;
  tasks: number | string;
  customers: number | string;
  supportRequests: number | string;
  quotations: number | string;
  openTasks: number | string;
  reminders: number | string;
  groupAccounts?: number | string;
}

export default function DashboardScreen() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isolatedAccountsCount, setIsolatedAccountsCount] = useState<number | string>('-');
  const [dealsList, setDealsList] = useState<DealItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileDropdownVisible, setProfileDropdownVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [activeQuickActionIndex, setActiveQuickActionIndex] = useState<number>(0);
  const { user, logout } = useAuth();
  const { showNotification } = useSocket();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Calculate bento card width to fit 2 items per row with 16dp gap and 20dp outer padding
  const bentoCardWidth = (width - 40 - 16) / 2;

  const getDateLabel = (d: Date | null) => {
    const date = d || new Date();
    if (isToday(date)) return `Today, ${format(date, 'dd MMM yyyy')}`;
    if (isTomorrow(date)) return `Tomorrow, ${format(date, 'dd MMM yyyy')}`;
    if (isYesterday(date)) return `Yesterday, ${format(date, 'dd MMM yyyy')}`;
    return format(date, 'EEE, dd MMM yyyy');
  };

  useEffect(() => {
    fetchDashboardData();
    fetchIsolatedAccountsCount();
    fetchDealsData();
  }, [user]);

  const fetchDealsData = async () => {
    try {
      const res = await apiClient.get('/deals');
      if (res.data?.success) {
        setDealsList(res.data.data || []);
      }
    } catch (error: any) {
      console.log('[DashboardScreen] Error fetching deals data:', error.message);
    }
  };

  const fetchIsolatedAccountsCount = async () => {
    if (!user) return;
    try {
      const res = await apiClient.get('/leads');
      if (res.data?.success) {
        const allLeads = res.data.data || [];
        const myLeads = allLeads.filter((item: any) => {
          const userId = user.id;
          const userEmail = user.email?.toLowerCase();
          
          const isCreatorById = item.createdByUserId === userId || item.createdBy === userId;
          const isCreatorByEmail = item.createdUserBy?.toLowerCase() === userEmail;
          const isAssigned = item.assignedTo === userId || item.assignedToUserId === userId;
          const isOwnerById = item.ownerUserId === userId || item.ownerId === userId;
          
          return isCreatorById || isCreatorByEmail || isAssigned || isOwnerById;
        });
        setIsolatedAccountsCount(myLeads.length);
      }
    } catch (error) {
      console.log('[DashboardScreen] Error fetching isolated accounts count:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const res = await apiClient.get('/dashboard/stats');
      if (res.data?.success) {
        setMetrics(res.data.data);
        console.log('[DashboardScreen] Dashboard data fetched successfully');
      }
    } catch (error: any) {
      console.log('[DashboardScreen] Error fetching dashboard data:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    console.log('[DashboardScreen] Manual refresh triggered');
    setRefreshing(true);
    await Promise.all([
      fetchDashboardData(),
      fetchIsolatedAccountsCount(),
      fetchDealsData()
    ]);
    setRefreshing(false);
    console.log('[DashboardScreen] Manual refresh completed');
  };

  const getMetric = (key: keyof DashboardMetrics) => {
    if (isLoading || !metrics) return '-';
    const val = metrics[key];
    return val !== undefined && val !== null ? val.toString() : '0';
  };

  if (isLoading && !metrics) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgDashboard, paddingTop: insets.top }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 12) + 8 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
      {/* 1. Top Header */}
      <View style={styles.header}>
        <View style={
          user?.email?.toLowerCase().includes('@lumossolution.com') || user?.email?.toLowerCase().includes('@gmail.com')
            ? styles.lumosLogoContainer
            : styles.logoContainer
        }>
          <Image
            source={
              user?.email?.toLowerCase().includes('@lumossolution.com') || user?.email?.toLowerCase().includes('@gmail.com')
                ? require('../../assets/images/lumos-logo.png')
                : require('../../assets/images/logo.png')
            }
            style={
              user?.email?.toLowerCase().includes('@lumossolution.com') || user?.email?.toLowerCase().includes('@gmail.com')
                ? styles.lumosLogo
                : styles.logo
            }
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>Welcome,</Text>
          <Text style={styles.name}>{user?.name || 'System Admin'}</Text>
          <Text style={styles.roleSmall}>{user?.role === 'admin' ? 'Admin' : 'User'}</Text>
        </View>
        <View style={styles.headerIconsRow}>
          <Pressable 
            style={styles.headerIcon}
            onPress={() => {
              console.log('[DashboardScreen] Triggering test notification toast');
              showNotification({
                id: 'test-123',
                companyId: 1,
                senderId: 'system',
                receiverId: user?.id ? String(user.id) : 'admin',
                message: 'This is a test socket notification!',
                notificationType: 'info',
                entityType: 'deal',
                entityId: '123',
                isRead: false,
                createdAt: new Date().toISOString(),
              });
            }}
          >
            <Feather name="bell" size={20} color={colors.dashboardIconColor} />
          </Pressable>
          <Pressable
            style={[styles.headerIcon, { marginLeft: spacing.sm }]}
            onPress={() => setProfileDropdownVisible(true)}
          >
            <Feather name="user" size={20} color={colors.dashboardIconColor} />
          </Pressable>
        </View>
      </View>

      {/* 2. Search Area */}
      <View style={styles.searchSection}>
        <View style={{ flex: 1 }}>
          <SearchBar
            placeholder="Search"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              console.log('[DashboardScreen] Search query updated:', text);
            }}
            onSubmitEditing={() => {
              if (searchQuery.trim().length > 0) {
                console.log('[DashboardScreen] Exact search query executed:', searchQuery);
                router.push({ pathname: '/search', params: { q: searchQuery } });
              }
            }}
          />
        </View>
      </View>

      {/* 3. Quick Actions Section (Slider as requested) */}
      <View style={[styles.section, styles.sliderSection]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.horizontalScroll} 
          contentContainerStyle={{ paddingRight: 40, paddingVertical: 2 }}
        >
          <QuickAction 
            title="Add Account" 
            icon="user-plus" 
            variant="primary" 
            isActive={activeQuickActionIndex === 0}
            onPress={() => {
              setActiveQuickActionIndex(0);
              router.push('/accounts/new');
            }} 
          />
          <QuickAction
            title="Add Customer"
            icon="user"
            variant="secondary"
            isActive={activeQuickActionIndex === 1}
            onPress={() => {
              setActiveQuickActionIndex(1);
              router.push('/customers/new' as any);
            }}
          />
          <QuickAction 
            title="Create Reminder" 
            icon="check-square" 
            variant="secondary" 
            isActive={activeQuickActionIndex === 2}
            onPress={() => {
              setActiveQuickActionIndex(2);
              router.push({ pathname: '/reminders/new', params: { date: selectedDate?.toISOString() } });
            }} 
          />
        </ScrollView>
      </View>

      {/* 4. Business Overview Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business Overview</Text>

        {/* Top 2 Cards: Accounts & My Group Accounts */}
        <View style={styles.bentoGrid}>
          <StatCard 
            title="Accounts" 
            value={isolatedAccountsCount.toString()} 
            icon="user" 
            variant="bento"
            style={{ width: bentoCardWidth }}
            onPress={() => router.push('/leads')} 
          />
          <StatCard 
            title="My Group Accounts" 
            value={getMetric('leads')} 
            icon="users" 
            iconFamily="FontAwesome5"
            variant="bento"
            style={{ width: bentoCardWidth }}
            onPress={() => router.push('/group-accounts')} 
          />
        </View>

        {/* Deals Hero Analytics Card */}
        <View style={{ marginTop: 12, marginBottom: 16 }}>
          <DealsHeroCard
            deals={dealsList}
            dealsCountOverride={getMetric('deals')}
            onPress={() => router.push('/deals')}
          />
        </View>

        {/* Bottom 2 Cards: Customers & Quotations */}
        <View style={styles.bentoGrid}>
          <StatCard 
            title="Customers" 
            value={getMetric('customers')} 
            icon="users" 
            variant="bento"
            style={{ width: bentoCardWidth }}
            onPress={() => router.push('/customers')} 
          />
          <StatCard 
            title="Quotations" 
            value={getMetric('quotations')} 
            icon="file-text" 
            variant="bento"
            style={{ width: bentoCardWidth }}
            onPress={() => router.push('/quotations')} 
          />
        </View>
      </View>

      {/* 5. Date Strip Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today</Text>
        <View style={styles.calendarCardNew}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="calendar" size={16} color={colors.dashboardIconColor} />
              <Text style={{ marginLeft: 8, fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>
                {getDateLabel(selectedDate)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push({ pathname: '/reminders', params: { date: selectedDate?.toISOString() } })} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: colors.dashboardIconColor, marginRight: 4, fontWeight: '500' }}>View Calendar</Text>
              <Feather name="chevron-right" size={16} color={colors.dashboardIconColor} />
            </TouchableOpacity>
          </View>
          <ReminderDateSelector selectedDate={selectedDate} onDateChange={setSelectedDate} variant="dashboard" />
        </View>
      </View>

      {/* 6. CRM Support Button */}
      <View style={[styles.section, styles.lastSection, { marginTop: spacing.xs, marginBottom: spacing.xs }]}>
        <Pressable
          style={({ pressed }) => [
            styles.supportButton,
            pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }
          ]}
          onPress={() => router.push('/support')}
        >
          <View style={styles.supportIconCircle}>
            <Feather name="headphones" size={20} color={colors.dashboardIconColor} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.supportTitle}>CRM Support</Text>
            <Text style={styles.supportSubtitle}>Get help or open a support ticket</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.dashboardIconColor} />
        </Pressable>
      </View>

      {/* Profile Dropdown Modal */}
      <Modal
        visible={profileDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setProfileDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setProfileDropdownVisible(false)}
        >
          <View style={styles.dropdownMenu}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownName}>{user?.name || 'System Admin'}</Text>
              <Text style={styles.dropdownEmail}>{user?.email || 'admin@system.com'}</Text>
            </View>
            <View style={styles.dropdownDivider} />
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setProfileDropdownVisible(false);
                logout();
              }}
            >
              <Feather name="log-out" size={18} color={colors.dashboardIconColor} />
              <Text style={styles.dropdownItemText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgDashboard,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgDashboard,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lumosLogoContainer: {
    width: 72,
    height: 48,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    resizeMode: 'contain',
    backgroundColor: 'transparent',
  },
  lumosLogo: {
    width: 72,
    height: 40,
    resizeMode: 'contain',
    backgroundColor: 'transparent',
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  name: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  roleSmall: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: 'normal',
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  headerIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  quickAddButton: {
    width: 36,
    height: 36,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  lastSection: {
    marginBottom: 0,
  },
  calendarCardNew: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing.md,
    ...shadows.card,
    shadowOpacity: 0.05,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  periodBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  periodBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    fontSize: 16,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: '-2%',
  },
  horizontalScroll: {
  },
  sliderSection: {
    marginTop: -4,
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  dropdownMenu: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginTop: 80,
    marginRight: spacing.lg,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  dropdownHeader: {
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  dropdownName: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  dropdownEmail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  dropdownItemText: {
    ...typography.body,
    color: colors.primary,
    marginLeft: spacing.sm,
    fontWeight: '500',
  },
  supportButton: {
    backgroundColor: colors.card,
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  supportIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  supportSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textSecondary,
    marginTop: 1,
  },
});

