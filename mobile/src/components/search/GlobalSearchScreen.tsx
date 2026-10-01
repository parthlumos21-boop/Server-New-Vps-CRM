import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '../../theme/colors';
import { spacing, radii } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useGlobalData, matchesQuery } from './useGlobalData';
import { SearchResultCard } from './SearchResultCard';
import { formatDealNo } from '../../utils/formatters';

// Helpers from web logic
const buildAccountContacts = (account: any) => {
  const sourceContacts = Array.isArray(account.raw?.contacts) && account.raw.contacts.length > 0
    ? account.raw.contacts
    : [{
      contactPerson: account.contactPerson,
      phone: account.contactPhone || account.phone,
      mobile: account.contactMobile || account.phone,
      email: account.contactEmail || account.email,
      designation: account.contactDesignation || '',
    }];

  return sourceContacts
    .filter((c: any) => c && (c.contactPerson || c.phone || c.mobile || c.email))
    .map((contact: any, index: number) => ({
      id: `${account.id || account._id}-contact-${index}`,
      accountId: account.id || account._id,
      accountNumber: account.accountNo || account.accountNumber || '-',
      accountName: account.name || '-',
      contactPerson: contact.contactPerson || '-',
      email: contact.email || account.email || '-',
      phone: contact.mobile || contact.phone || account.phone || '-',
      designation: contact.designation || '-',
    }));
};

const getPrimaryCustomerContact = (customer: any) => customer.contacts?.[0] || {};
const buildCustomerContacts = (customer: any) => {
  const contacts = Array.isArray(customer.contacts) && customer.contacts.length > 0
    ? customer.contacts
    : [getPrimaryCustomerContact(customer)];

  return contacts
    .filter((c: any) => c && (c.contactPerson || c.phone || c.mobile || c.email))
    .map((contact: any, index: number) => ({
      id: `${customer.id || customer._id}-contact-${index}`,
      customerId: customer.id || customer._id,
      customerNumber: customer.customerNumber || '-',
      customerName: customer.customerName || '-',
      contactPerson: contact.contactPerson || '-',
      email: contact.email || '-',
      phone: contact.mobile || contact.phone || '-',
      designation: contact.designation || '-',
    }));
};

const buildDealContacts = (deal: any) => [{
  id: `${deal.id || deal._id}-contact`,
  dealId: deal.id || deal._id,
  dealNumber: deal.dealNumber || deal.dealNo || '-',
  dealName: deal.name || deal.dealName || deal.projectName || '-',
  contactPerson: deal.contactPerson || '-',
  email: deal.contactEmail || '-',
  phone: deal.contactPhone || '-',
}].filter((c) => (c.contactPerson !== '-' || c.email !== '-' || c.phone !== '-'));

export function GlobalSearchScreen({ basePath }: { basePath: string }) {
  const params = useLocalSearchParams();
  const initialQuery = Array.isArray(params.q) ? params.q[0] : params.q || '';
  const [query, setQuery] = useState(initialQuery);
  const { accounts, customers, deals, projects, isLoading } = useGlobalData();

  const normalizedSearchQuery = query.trim().toLowerCase();

  // 1. Accounts
  const accountRows = useMemo(() => (
    accounts
      .filter((a) => matchesQuery(normalizedSearchQuery, [
        a.accountNo, a.accountNumber, a.name, a.projectName, a.email, a.phone, a.accountOwner, a.contactPerson
      ]))
  ), [accounts, normalizedSearchQuery]);

  // 2. Account Contacts
  const accountContactRows = useMemo(() => (
    accounts
      .flatMap(buildAccountContacts)
      .filter((c) => matchesQuery(normalizedSearchQuery, [
        c.accountNumber, c.accountName, c.contactPerson, c.email, c.phone, c.designation
      ]))
  ), [accounts, normalizedSearchQuery]);

  // 3. Customers
  const customerRows = useMemo(() => (
    customers
      .filter((c) => matchesQuery(normalizedSearchQuery, [
        c.customerNumber, c.customerName, c.email, c.phone, c.customerOwner
      ]))
  ), [customers, normalizedSearchQuery]);

  // 4. Customer Contacts
  const customerContactRows = useMemo(() => (
    customers
      .flatMap(buildCustomerContacts)
      .filter((c) => matchesQuery(normalizedSearchQuery, [
        c.customerNumber, c.customerName, c.contactPerson, c.email, c.phone, c.designation
      ]))
  ), [customers, normalizedSearchQuery]);

  // 5. Deals
  const dealRows = useMemo(() => (
    deals
      .filter((d) => matchesQuery(normalizedSearchQuery, [
        d.dealNo, d.dealNumber, d.name, d.dealName, d.projectName, d.customerName, d.contactPerson
      ]))
  ), [deals, normalizedSearchQuery]);

  // 6. Deal Contacts
  const dealContactRows = useMemo(() => (
    deals
      .flatMap(buildDealContacts)
      .filter((c) => matchesQuery(normalizedSearchQuery, [
        c.dealNumber, c.dealName, c.contactPerson, c.email, c.phone
      ]))
  ), [deals, normalizedSearchQuery]);

  // 7. Projects
  const projectRows = useMemo(() => (
    projects
      .filter((p) => matchesQuery(normalizedSearchQuery, [
        p.dealNo, p.dealNumber, p.projectName, p.name, p.customerName
      ]))
  ), [projects, normalizedSearchQuery]);

  const renderSection = (title: string, data: any[], renderItem: (item: any, index: number) => React.ReactNode) => {
    // Memory optimization for 3GB RAM devices: only render first 30 matches per section
    const displayedData = data.slice(0, 30);
    const hasMore = data.length > 30;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title} ({data.length})</Text>
        </View>
        {data.length > 0 ? (
          <>
            {displayedData.map((item, index) => <View key={item.id || index}>{renderItem(item, index)}</View>)}
            {hasMore && (
              <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 8, fontSize: 12 }}>
                Showing 30 of {data.length} results. Please refine your search for more.
              </Text>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Feather name="search" size={24} color={colors.textSecondary} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyText}>No matching records found.</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.searchInputContainer}>
          <Feather name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search all records..."
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Feather name="x-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Dynamic Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.mainTitle}>Global Search Results</Text>
        {query ? (
          <Text style={styles.subTitle}>Showing matches for "{query}"</Text>
        ) : (
          <Text style={styles.subTitle}>Type to start searching...</Text>
        )}
      </View>
      <View style={styles.divider} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading database...</Text>
          </View>
        ) : !query ? (
          <View style={styles.loadingContainer}>
            <Feather name="globe" size={48} color={colors.border} style={{ marginBottom: 16 }} />
            <Text style={styles.loadingText}>Start typing to search across Accounts, Customers, Deals, and Projects.</Text>
          </View>
        ) : (
          <>
            {/* 1. Accounts */}
            {renderSection('Accounts', accountRows, (a) => (
              <SearchResultCard
                title={`Account #${a.accountNo || a.accountNumber || '-'}`}
                subtitle={a.name || '-'}
                description={a.projectName || '-'}
                fields={[
                  { label: 'Email', value: a.email },
                  { label: 'Phone', value: a.phone }
                ]}
                onPress={() => router.push(`${basePath}/lead-details/${a.id || a._id}` as any)}
              />
            ))}

            {/* 2. Account Contacts */}
            {renderSection('Account Contacts', accountContactRows, (c) => (
              <SearchResultCard
                title={c.contactPerson}
                subtitle={`Account #${c.accountNumber} - ${c.accountName}`}
                fields={[
                  { label: 'Desig.', value: c.designation },
                  { label: 'Email', value: c.email },
                  { label: 'Phone', value: c.phone }
                ]}
              />
            ))}

            {/* 3. Customers */}
            {renderSection('Customers', customerRows, (c) => (
              <SearchResultCard
                title={`Customer #${c.customerNumber || '-'}`}
                subtitle={c.customerName || '-'}
                fields={[
                  { label: 'Owner', value: c.customerOwner },
                  { label: 'Email', value: c.email },
                  { label: 'Phone', value: c.phone }
                ]}
                onPress={() => router.push(`${basePath}/customer-details/${c.id || c._id}` as any)}
              />
            ))}

            {/* 4. Customer Contacts */}
            {renderSection('Customer Contacts', customerContactRows, (c) => (
              <SearchResultCard
                title={c.contactPerson}
                subtitle={`Customer #${c.customerNumber} - ${c.customerName}`}
                fields={[
                  { label: 'Desig.', value: c.designation },
                  { label: 'Email', value: c.email },
                  { label: 'Phone', value: c.phone }
                ]}
              />
            ))}

            {/* 5. Deals */}
            {renderSection('Deals', dealRows, (d) => (
              <SearchResultCard
                title={`Deal #${formatDealNo(d.dealNo || d.dealNumber || d.id)}`}
                subtitle={d.dealName || d.name || '-'}
                description={d.projectName || '-'}
                fields={[
                  { label: 'Status', value: d.dealStatus || d.status },
                  { label: 'Value', value: d.dealValue ? `₹${d.dealValue}` : '-' }
                ]}
                onPress={() => router.push(`${basePath}/deal-details/${d.id || d._id}` as any)}
              />
            ))}

            {/* 6. Deal Contacts */}
            {renderSection('Deal Contacts', dealContactRows, (c) => (
              <SearchResultCard
                title={c.contactPerson}
                subtitle={`Deal #${c.dealNumber} - ${c.dealName}`}
                fields={[
                  { label: 'Email', value: c.email },
                  { label: 'Phone', value: c.phone }
                ]}
              />
            ))}

            {/* 7. Projects */}
            {renderSection('Projects', projectRows, (p) => (
              <SearchResultCard
                title={p.projectName || p.name || '-'}
                subtitle={`Deal #${p.dealNo || p.dealNumber || '-'}`}
                fields={[
                  { label: 'Customer', value: p.customerName || p.customer || '-' },
                  { label: 'PO Value', value: p.poValue ? `₹${p.poValue}` : '-' }
                ]}
                onPress={() => router.push(`${basePath}/deal-details/${p.id || p._id}` as any)}
              />
            ))}
          </>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: spacing.sm,
    padding: spacing.xs,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },
  titleContainer: {
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  mainTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subTitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  divider: {
    height: 2,
    backgroundColor: colors.primary, // Red divider
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    maxWidth: 768,
    alignSelf: 'center',
    padding: spacing.md,
    paddingBottom: 40,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.white,
    fontWeight: '700',
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  loadingContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});


