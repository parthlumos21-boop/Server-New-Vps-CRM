import React, { useEffect, useState } from 'react';
import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { View, ActivityIndicator, StyleSheet, Modal, TouchableOpacity, Text, Linking } from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import CheckBox from 'expo-checkbox';
import { fetchLegalAcceptance, submitLegalAcceptance } from '../../src/services/legalApi';
import { LEGAL_URLS } from '../../config/legal';

export default function TabLayout() {
  const { user, isLoading } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalChecked, setLegalChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.id && user?.role !== 'admin') {
      fetchLegalAcceptance(user.id.toString()).then(accepted => {
        if (accepted === false) {
          setShowLegalModal(true);
        }
      });
    }
  }, [user]);

  const handleAcceptLegal = async () => {
    if (!user?.id) return;
    setIsSubmitting(true);
    const success = await submitLegalAcceptance(user.id.toString());
    setIsSubmitting(false);
    if (success) {
      setShowLegalModal(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (user?.role === 'admin') {
    return <Redirect href="/(admin)/dashboard" />;
  }

  const isAndroid = Platform.OS === 'android';
  const baseHeight = isAndroid ? 56 : 49;
  const safeBottom = Math.max(insets.bottom, isAndroid ? 48 : 34);

  return (
    <>
      <Tabs 
      screenOptions={{ 
        tabBarActiveTintColor: '#1650C8',
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
        tabBarStyle: [styles.tabBar, { 
          paddingBottom: safeBottom,
          height: baseHeight + safeBottom,
        }],
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Feather name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="leads"
        options={{
          title: 'Accounts',
          tabBarIcon: ({ color }) => <Feather name="user" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="deals"
        options={{
          title: 'Deals',
          tabBarIcon: ({ color }) => <FontAwesome5 name="handshake" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          tabBarIcon: ({ color }) => <Feather name="users" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <Feather name="menu" size={24} color={color} />,
        }}
      />
      
      {/* Hidden Screens */}
      <Tabs.Screen name="support" options={{ href: null }} />
      <Tabs.Screen name="reminders" options={{ href: null }} />
      <Tabs.Screen name="quotations" options={{ href: null }} />
      <Tabs.Screen name="group-accounts" options={{ href: null }} />
      
      {/* Hide detail screens from tab bar AND hide tab bar itself on these screens */}
      <Tabs.Screen name="lead-details/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="customer-details/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="deal-details/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="support-details/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="support/new" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="reminder-details/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="reminders/new" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="quotation-details/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="accounts/new" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="customers/new" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>

    <Modal
      visible={showLegalModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Legal Agreements</Text>
          <Text style={styles.modalText}>
            Before continuing, please review and accept our updated legal agreements.
          </Text>

          <View style={styles.modalLinksContainer}>
            <TouchableOpacity onPress={() => Linking.openURL(LEGAL_URLS.privacyPolicy)}>
              <Text style={styles.modalLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL(LEGAL_URLS.termsAndConditions)}>
              <Text style={styles.modalLink}>Terms & Conditions</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.checkboxContainer}>
            <CheckBox
              value={legalChecked}
              onValueChange={setLegalChecked}
              style={styles.checkbox}
            />
            <Text style={styles.checkboxText}>
              I acknowledge and agree to the Privacy Policy and Terms & Conditions.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.acceptButton, !legalChecked && styles.acceptButtonDisabled]}
            disabled={!legalChecked || isSubmitting}
            onPress={handleAcceptLegal}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.acceptButtonText}>Accept & Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  tabBar: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    elevation: 0,
    shadowColor: 'transparent',
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalLinksContainer: {
    marginBottom: 24,
    gap: 12,
  },
  modalLink: {
    fontSize: 14,
    color: colors.primary,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  checkbox: {
    marginRight: 12,
  },
  checkboxText: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  acceptButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  acceptButtonDisabled: {
    backgroundColor: colors.border,
  },
  acceptButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

