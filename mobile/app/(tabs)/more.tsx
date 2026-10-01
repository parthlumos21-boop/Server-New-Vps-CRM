import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';
import { useAuth } from '../../src/context/AuthContext';

export default function MoreScreen() {
  const { logout, user } = useAuth();
  const insets = useSafeAreaInsets();

  const menuItems = [
    { label: 'Quotations', icon: 'file-text', onPress: () => router.push('/quotations?from=more') },
    { label: 'Support Requests', icon: 'help-circle', onPress: () => router.push('/support?from=more') },
    { label: 'Tasks', icon: 'check-square', onPress: () => router.push('/reminders?from=more') },
  ];

  // Helper to get initials
  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>
      
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          </View>
          <Text style={styles.profileName}>{user?.name || 'User'}</Text>
          {user?.role && (
            <Text style={styles.profileRole}>{user.role === 'admin' ? 'Admin' : user.role === 'user' ? 'User' : user.role}</Text>
          )}
          {user?.email && (
            <Text style={styles.profileEmail}>{user.email}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CRM Modules</Text>
          <View style={styles.card}>
            {menuItems.map((item, idx) => (
              <TouchableOpacity 
                key={item.label} 
                style={[styles.menuItem, idx !== menuItems.length - 1 && styles.borderBottom]}
                onPress={item.onPress}
              >
                <Feather name={item.icon as any} size={20} color={colors.textSecondary} />
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Feather name="chevron-right" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System</Text>
          <View style={styles.card}>
            <TouchableOpacity style={[styles.menuItem, styles.borderBottom]} onPress={() => router.push('/settings/legal' as any)}>
              <Feather name="shield" size={20} color={colors.textSecondary} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[styles.menuLabel, { marginLeft: 0 }]}>Legal (Privacy Policy & Terms)</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
              <Feather name="settings" size={20} color={colors.textSecondary} />
              <Text style={styles.menuLabel}>Settings</Text>
              <Feather name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuItem} onPress={logout}>
              <Feather name="log-out" size={20} color={colors.primary} />
              <Text style={[styles.menuLabel, { color: colors.primary }]}>Logout</Text>
              <Feather name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  content: {
    padding: spacing.lg,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: spacing.xl + spacing.md,
  },
  avatarContainer: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    ...typography.h2,
    color: colors.white,
  },
  profileName: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  profileRole: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  profileEmail: {
    ...typography.caption,
    color: colors.textMuted,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md + 4,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    marginLeft: spacing.md,
    fontWeight: '500',
  },
});
