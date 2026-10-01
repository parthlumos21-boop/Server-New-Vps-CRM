import React, { useState, useEffect, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WizardHeader } from '../accounts/WizardHeader';
import { FormField } from '../accounts/FormField';
import { SelectField } from '../accounts/SelectField';
import { HorizontalDateSelector } from '../reminders/HorizontalDateSelector';
import { CalendarModal } from '../calendar/CalendarModal';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { router } from 'expo-router';
import apiClient from '../../api/client';
import { getCrmOwnerDisplay } from '../../utils/crmUserDirectory';
import { normalizeCustomerItem, buildUserLookupMap, resetSeenLegacyIds } from '../../utils/customerNormalizer';
import {
  DEAL_TYPE_OPTIONS,
  DEAL_SOURCE_OPTIONS,
  DEAL_VALUE_CURRENCIES,
  CUSTOMER_QUOTATION_STATUS_OPTIONS,
  DEAL_LIFECYCLE_STATUS_OPTIONS,
  DEAL_STATUS_OPTIONS,
  DEAL_STAGE_OPTIONS,
} from '../../utils/constants';

const formatDateLocal = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface DealWizardRef {
  stepBack: () => boolean;
}

export const DealWizard = React.forwardRef<DealWizardRef, { onNavigateBack?: () => void; onStepChange?: (step: number) => void }>(
  ({ onNavigateBack, onStepChange }, ref) => {
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState(1);
    const today = formatDateLocal(new Date());

    React.useImperativeHandle(ref, () => ({
      stepBack: () => {
        if (step > 1) {
          setStep((prev) => prev - 1);
          return true;
        }
        return false;
      },
    }));

    useEffect(() => {
      if (onStepChange) {
        onStepChange(step);
      }
    }, [step, onStepChange]);

    useEffect(() => {
      const onBackPress = () => {
        if (step > 1) {
          setStep((prev) => prev - 1);
          return true;
        }
        if (onNavigateBack) {
          onNavigateBack();
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [step, onNavigateBack]);

  const [form, setForm] = useState<any>({
    dealDate: today,
    dealName: '',
    description: '',
    poValue: '',
    dealCoOwners: '',
    value: '',
    valueCurrency: 'INR',
    dealScore: '',
    consultantName: '',
    customerRefNo: '',
    projectName: '',
    customerQuotationStatus: '',
    dealType: '',
    dealOwner: '',
    dealSource: '',
    address: '',
    expectedClosureDate: today,
    probability: '1',
    productCategory: '',
    customerRefDate: today,
    gstin: '',
    jobNo: '',
    customerOrderStatus: '',
    status: 'new',
    stage: '',
    closeDate: today,
    city: '',
    contactPerson: '',
    contactPhone: '',
    contactMobile: '',
    contactEmail: '',
    contactDesignation: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<{label: string, value: string}[]>([]);
  const [userDirectory, setUserDirectory] = useState<any[]>([]);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);

  // Modals
  const [showDealDateModal, setShowDealDateModal] = useState(false);
  const [showClosureDateModal, setShowClosureDateModal] = useState(false);
  const [showRefDateModal, setShowRefDateModal] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await apiClient.get('/users/directory');
        const usersData = response.data?.data || [];
        setUserDirectory(usersData);
        setUsers(usersData.map((u: any) => ({ label: u.name, value: u.name })));
      } catch (err) {
        console.error('Failed to load users:', err);
      }
    };
    loadData();
  }, []);

  const searchEntities = async (query: string) => {
    setSearchQuery(query);
    setSelectedEntity(null);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const res = await apiClient.get('/customers');
      const items = res.data?.data || [];
      resetSeenLegacyIds();
      const userMap = buildUserLookupMap(userDirectory);
      const normalizedItems = items.map((item: any) => normalizeCustomerItem(item, userMap));

      const filtered = normalizedItems.filter((item: any) => {
        const name = String(item.displayName || item.customerName || item.name || '').toLowerCase();
        const no = String(item.displayCustomerNumber || item.customerNumber || '').toLowerCase();
        const owner = String(item.displayCustomerOwner || item.customerOwner || '').toLowerCase();
        const q = query.toLowerCase();
        return name.includes(q) || no.includes(q) || owner.includes(q);
      }).slice(0, 10);
      setSearchResults(filtered);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectEntity = (item: any) => {
    setSelectedEntity(item);
    setSearchResults([]);
    setSearchQuery(item.displayName || item.customerName || item.name || '');
    
    // Pre-fill form fields dynamically from MongoDB customer document
    const contact = (item.contacts && item.contacts[0]) || {};
    const rawNum = item.displayCustomerNumber || item.customerNumber || '';
    const customerNoFormatted = (rawNum.startsWith('SSC') && !rawNum.startsWith('OBJ'))
      ? rawNum
      : item.id && !isNaN(Number(item.id))
        ? `SSC${String(item.id).padStart(5, '0')}`
        : rawNum;

    setForm((prev: any) => ({
      ...prev,
      dealOwner: prev.dealOwner || item.displayCustomerOwner || item.customerOwner || '',
      dealType: prev.dealType || item.customerCategory || '',
      productCategory: prev.productCategory || item.customerCategory || '',
      consultantName: prev.consultantName || item.consultantName || '',
      jobNo: prev.jobNo || item.jobNo || '',
      projectName: prev.projectName || item.projectName || '',
      address: prev.address || item.address || '',
      gstin: prev.gstin || item.gstin || '',
      city: prev.city || item.city || '',
      customerQuotationStatus: prev.customerQuotationStatus || item.customerQuotationStatus || item.customerStatus || '',
      customerRefNo: prev.customerRefNo || customerNoFormatted,
      contactPerson: prev.contactPerson || contact.contactPerson || item.contactPerson || '',
      contactPhone: prev.contactPhone || contact.phone || item.contactPhone || '',
      contactMobile: prev.contactMobile || contact.mobile || item.contactMobile || contact.phone || item.contactPhone || '',
      contactEmail: prev.contactEmail || contact.email || item.contactEmail || '',
      contactDesignation: prev.contactDesignation || contact.designation || item.contactDesignation || '',
    }));
    
    setErrors((prev) => {
      const next = { ...prev };
      delete next.customer;
      return next;
    });
  };

  const update = (key: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validateStep = (currentStep: number) => {
    const nextErrors: Record<string, string> = {};
    if (currentStep === 1) {
      if (!selectedEntity) nextErrors.customer = 'Please select a customer or account';
    } else if (currentStep === 3) {
      if (!form.dealName.trim()) nextErrors.dealName = 'Required';
      if (!form.description.trim()) nextErrors.description = 'Required';
      if (!form.dealType) nextErrors.dealType = 'Required';
      if (!form.dealSource) nextErrors.dealSource = 'Required';
      if (!form.dealOwner) nextErrors.dealOwner = 'Required';
      if (!form.value) nextErrors.value = 'Required';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    if (step < 4) {
      setStep((val) => val + 1);
    } else {
      submitDeal();
    }
  };

  const submitDeal = async () => {
    try {
      const rawNum = selectedEntity?.displayCustomerNumber || selectedEntity?.customerNumber || '';
      const formattedCustomerNo = (rawNum.startsWith('SSC') && !rawNum.startsWith('OBJ'))
        ? rawNum
        : selectedEntity?.id && !isNaN(Number(selectedEntity.id))
          ? `SSC${String(selectedEntity.id).padStart(5, '0')}`
          : form.customerRefNo || rawNum || '';

      const payload = {
        ...form,
        name: form.dealName.trim(),
        accountId: '',
        customerId: selectedEntity.id || '',
        convertedFromAccount: false,
        conversionSource: '',
        accountName: '',
        accountNumber: '',
        customerName: selectedEntity.customerName || selectedEntity.name || '',
        customerNumber: formattedCustomerNo,
        customerRefNo: form.customerRefNo || formattedCustomerNo,
        dealOwner: form.dealOwner.trim() || selectedEntity.customerOwner || '',
        ownerName: form.dealOwner.trim() || selectedEntity.customerOwner || '',
        contacts: [
          {
            prefix: 'Mr.',
            name: form.contactPerson.trim(),
            designation: form.contactDesignation.trim(),
            phone: form.contactMobile.trim() || form.contactPhone.trim(),
            email: form.contactEmail.trim(),
            isPrimary: true,
          }
        ]
      };
      
      const res = await apiClient.post('/deals', payload);
      if (res.data?.success || res.status === 201 || res.status === 200) {
        Alert.alert('Success', 'Deal created successfully', [
          { 
            text: 'OK', 
            onPress: () => {
              if (onNavigateBack) {
                onNavigateBack();
              } else if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/deals');
              }
            } 
          }
        ]);
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to create deal');
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      Alert.alert('Error', 'Failed to create deal');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <WizardHeader currentStep={step} totalSteps={4} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && (
            <>
              <SectionTitle>Search Customer</SectionTitle>
              <FormField
                label="Search Customer"
                required
                value={searchQuery}
                onChangeText={(val) => searchEntities(val)}
                error={errors.customer}
              />
              
              {isSearching && <ActivityIndicator style={{marginTop: 10}} />}
              
              {!isSearching && searchResults.length > 0 && (
                <View style={styles.searchResults}>
                  {searchResults.map((item, idx) => (
                    <TouchableOpacity 
                      key={idx} 
                      style={styles.searchItem}
                      onPress={() => handleSelectEntity(item)}
                    >
                      <Text style={styles.searchItemName}>{item.displayName || item.customerName || item.name}</Text>
                      <Text style={styles.searchItemSub}>{item.displayCustomerNumber || item.customerNumber || '-'} | {item.displayCustomerOwner || item.customerOwner || 'Unassigned'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              {selectedEntity && (
                <View style={styles.selectedEntityCard}>
                  <Text style={styles.selectedEntityText}>
                    Selected: {selectedEntity.displayName || selectedEntity.customerName || selectedEntity.name}
                  </Text>
                </View>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <SectionTitle>Customer Details</SectionTitle>
              <FormField label="Customer Name" value={selectedEntity?.displayName || selectedEntity?.customerName || selectedEntity?.name || ''} editable={false} />
              <FormField label="Customer Owner" value={selectedEntity?.displayCustomerOwner || selectedEntity?.customerOwner || ''} editable={false} />
              <FormField label="Customer Category" value={selectedEntity?.customerCategory || selectedEntity?.category || ''} editable={false} />
              <FormField label="Customer Status" value={selectedEntity?.customerStatus || selectedEntity?.status || ''} editable={false} />
            </>
          )}

          {step === 3 && (
            <>
              <SectionTitle>Deal Details</SectionTitle>
              <FormField label="Deal Name" required value={form.dealName} onChangeText={(val) => update('dealName', val)} error={errors.dealName} />
              
              <View style={styles.dateSection}>
                <View style={styles.dateHeader}>
                  <Text style={styles.dateLabel}>Deal Date <Text style={styles.required}>*</Text></Text>
                  <TouchableOpacity onPress={() => setShowDealDateModal(true)}>
                    <Text style={styles.dateValue}>{form.dealDate ? format(new Date(form.dealDate), 'dd-MM-yyyy') : ''}</Text>
                  </TouchableOpacity>
                </View>
                <HorizontalDateSelector selectedDate={form.dealDate} onSelectDate={(date) => update('dealDate', date)} />
                {showDealDateModal && (
                  <CalendarModal visible={showDealDateModal} onClose={() => setShowDealDateModal(false)} selectedDate={new Date(form.dealDate)} onSelectDate={(date) => { update('dealDate', formatDateLocal(date)); setShowDealDateModal(false); }} reminders={[]} position="center" />
                )}
              </View>

              <View style={styles.dateSection}>
                <View style={styles.dateHeader}>
                  <Text style={styles.dateLabel}>Expected Closure Date <Text style={styles.required}>*</Text></Text>
                  <TouchableOpacity onPress={() => setShowClosureDateModal(true)}>
                    <Text style={styles.dateValue}>{form.expectedClosureDate ? format(new Date(form.expectedClosureDate), 'dd-MM-yyyy') : ''}</Text>
                  </TouchableOpacity>
                </View>
                <HorizontalDateSelector selectedDate={form.expectedClosureDate} onSelectDate={(date) => update('expectedClosureDate', date)} />
                {showClosureDateModal && (
                  <CalendarModal visible={showClosureDateModal} onClose={() => setShowClosureDateModal(false)} selectedDate={new Date(form.expectedClosureDate)} onSelectDate={(date) => { update('expectedClosureDate', formatDateLocal(date)); setShowClosureDateModal(false); }} reminders={[]} position="center" />
                )}
              </View>

              <FormField label="Probability (%)" keyboardType="numeric" value={form.probability} onChangeText={(val) => update('probability', val)} />
              
              <View style={styles.dealValueContainer}>
                <Text style={styles.dealValueLabel}>
                  Deal Value <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.dealValueRow}>
                  <View style={styles.currencySelectCol}>
                    <SelectField
                      label=""
                      value={form.valueCurrency || 'INR'}
                      options={DEAL_VALUE_CURRENCIES.map(c => ({ label: c, value: c }))}
                      onChange={(val) => update('valueCurrency', val)}
                      containerStyle={{ marginBottom: 0 }}
                      renderTrigger={(onPress, val) => (
                        <Pressable style={styles.currencyTrigger} onPress={onPress}>
                          <Text style={styles.currencyTriggerText}>{val || 'INR'}</Text>
                        </Pressable>
                      )}
                    />
                  </View>
                  <View style={styles.valueInputCol}>
                    <TextInput
                      keyboardType="numeric"
                      placeholder="Amount"
                      placeholderTextColor={colors.textMuted}
                      value={form.value}
                      onChangeText={(val) => update('value', val)}
                      style={[styles.inlineInput, errors.value ? styles.inputError : null]}
                    />
                    {!!errors.value && <Text style={styles.inlineErrorText}>{errors.value}</Text>}
                  </View>
                </View>
              </View>

              <FormField label="PO Value" keyboardType="numeric" value={form.poValue} onChangeText={(val) => update('poValue', val)} />
              <FormField label="Deal Score" keyboardType="numeric" value={form.dealScore} onChangeText={(val) => update('dealScore', val)} />
              <SelectField label="Deal Owner" required value={form.dealOwner} options={users} onChange={(val) => update('dealOwner', val)} error={errors.dealOwner} />
              <SelectField label="Deal Co-Owners" value={form.dealCoOwners} options={users} onChange={(val) => update('dealCoOwners', val)} />
              <SelectField label="Deal Type" required value={form.dealType} options={DEAL_TYPE_OPTIONS.map(o => ({label: o, value: o}))} onChange={(val) => update('dealType', val)} error={errors.dealType} />
              <SelectField label="Deal Source" required value={form.dealSource} options={DEAL_SOURCE_OPTIONS.map(o => ({label: o, value: o}))} onChange={(val) => update('dealSource', val)} error={errors.dealSource} />
              
              <SelectField label="Customer Quotation Status" value={form.customerQuotationStatus} options={CUSTOMER_QUOTATION_STATUS_OPTIONS.map(o => ({label: o, value: o}))} onChange={(val) => update('customerQuotationStatus', val)} />
              <SelectField label="Customer Order Status" value={form.customerOrderStatus} options={DEAL_LIFECYCLE_STATUS_OPTIONS.map(o => ({label: o, value: o}))} onChange={(val) => update('customerOrderStatus', val)} />
              
              <FormField label="Project Name" value={form.projectName} onChangeText={(val) => update('projectName', val)} />
              <FormField label="Consultant Name" value={form.consultantName} onChangeText={(val) => update('consultantName', val)} />
              <FormField label="Job No." value={form.jobNo} onChangeText={(val) => update('jobNo', val)} />
              <FormField label="Customer Ref No" value={form.customerRefNo} onChangeText={(val) => update('customerRefNo', val)} />
              
              <View style={styles.dateSection}>
                <View style={styles.dateHeader}>
                  <Text style={styles.dateLabel}>Customer Ref Date</Text>
                  <TouchableOpacity onPress={() => setShowRefDateModal(true)}>
                    <Text style={styles.dateValue}>{form.customerRefDate ? format(new Date(form.customerRefDate), 'dd-MM-yyyy') : ''}</Text>
                  </TouchableOpacity>
                </View>
                {showRefDateModal && (
                  <CalendarModal visible={showRefDateModal} onClose={() => setShowRefDateModal(false)} selectedDate={new Date(form.customerRefDate)} onSelectDate={(date) => { update('customerRefDate', formatDateLocal(date)); setShowRefDateModal(false); }} reminders={[]} position="center" />
                )}
              </View>

              <FormField label="GSTIN" value={form.gstin} onChangeText={(val) => update('gstin', val)} />
              <FormField label="Product Category" value={form.productCategory} onChangeText={(val) => update('productCategory', val)} />
              <FormField label="Description" required multiline value={form.description} onChangeText={(val) => update('description', val)} error={errors.description} />
            </>
          )}

          {step === 4 && (
            <>
              <SectionTitle>Contacts</SectionTitle>
              <FormField label="Contact Person" required value={form.contactPerson} onChangeText={(val) => update('contactPerson', val)} />
              <FormField label="Designation" value={form.contactDesignation} onChangeText={(val) => update('contactDesignation', val)} />
              <FormField label="Contact Mobile" keyboardType="phone-pad" value={form.contactMobile} onChangeText={(val) => update('contactMobile', val)} />
              <FormField label="Contact Email" keyboardType="email-address" autoCapitalize="none" value={form.contactEmail} onChangeText={(val) => update('contactEmail', val)} />
            </>
          )}
        </ScrollView>

        <View style={[styles.buttons, { paddingBottom: Math.max(insets.bottom, 18) }]}>
          <Button title="‹  Prev" secondary disabled={step === 1} onPress={() => setStep((val) => Math.max(1, val - 1))} />
          <Button title={step === 4 ? 'Save' : 'Next  ›'} onPress={handleNext} />
        </View>
        </View>
    </KeyboardAvoidingView>
  );
});

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionText}>{children}</Text>
    </View>
  );
}

function Button({
  title,
  onPress,
  secondary,
  disabled,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        secondary ? styles.buttonSecondary : styles.buttonPrimary,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          secondary ? styles.buttonTextSecondary : styles.buttonTextPrimary,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  card: { flex: 1, backgroundColor: colors.white },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 14, paddingTop: 18, paddingBottom: 16 },
  searchToggle: { flexDirection: 'row', marginBottom: 16, backgroundColor: colors.background, borderRadius: 8, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  toggleBtnActive: { backgroundColor: colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  toggleText: { ...typography.subtitle, color: colors.textSecondary },
  toggleTextActive: { color: colors.primary, fontWeight: '600' },
  searchResults: { marginTop: 8, backgroundColor: colors.white, borderRadius: 8, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  searchItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchItemName: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  searchItemSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  selectedEntityCard: { marginTop: 12, padding: 12, backgroundColor: colors.primary + '10', borderRadius: 8, borderWidth: 1, borderColor: colors.primary + '40' },
  selectedEntityText: { ...typography.body, color: colors.primary, fontWeight: '600' },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 12, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border },
  sectionContainer: { marginBottom: 18 },
  sectionText: { ...typography.h3, color: colors.textPrimary, textAlign: 'center' },
  button: { height: 38, minWidth: 105, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSecondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.primary },
  buttonDisabled: { opacity: 0.35 },
  buttonText: { ...typography.subtitle },
  buttonTextPrimary: { color: colors.white },
  buttonTextSecondary: { color: colors.primary },
  dateSection: { marginBottom: 14 },
  dateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dateLabel: { ...typography.caption, color: colors.textSecondary },
  dateValue: { ...typography.body, color: colors.primary, fontWeight: '600' },
  required: { color: colors.primary },
  dealValueContainer: { marginBottom: 14 },
  dealValueLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: 4 },
  dealValueRow: { flexDirection: 'row', alignItems: 'center' },
  currencySelectCol: { width: 64, marginRight: 8 },
  valueInputCol: { flex: 1 },
  currencyTrigger: {
    height: 38,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyTriggerText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  inlineInput: {
    height: 38,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 4,
    paddingHorizontal: 12,
    color: colors.textPrimary,
    ...typography.body,
  },
  inputError: {
    borderColor: colors.error,
  },
  inlineErrorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: 4,
    fontSize: 11,
  },
});
