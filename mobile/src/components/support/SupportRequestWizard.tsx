import React, { useState, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as DocumentPicker from 'expo-document-picker';
import { Feather } from '@expo/vector-icons';
import { WizardHeader } from '../accounts/WizardHeader';
import { FormField } from '../accounts/FormField';
import { SelectField } from '../accounts/SelectField';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { SUPPORT_REQUEST_TYPE_OPTIONS } from '../../utils/constants';

interface SupportForm {
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  customerCompany: string;
  requestType: string;
  ownerId: string;
  title: string;
  description: string;
  internalNotes: string;
  locationName: string;
  address: string;
  country: string;
  state: string;
  city: string;
  zipCode: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  contactDesignation: string;
  latitude: string;
  longitude: string;
  locationAccuracy: string;
  locationSource: string;
  locationCapturedAt: string;
}

export function SupportRequestWizard() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [owners, setOwners] = useState<{label: string, value: string}[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isLocating, setIsLocating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  
  const [form, setForm] = useState<SupportForm>({
    customerName: '',
    customerMobile: '',
    customerEmail: '',
    customerCompany: '',
    requestType: '',
    ownerId: '',
    title: '',
    description: '',
    internalNotes: '',
    locationName: '',
    address: '',
    country: '',
    state: '',
    city: '',
    zipCode: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    contactDesignation: '',
    latitude: '',
    longitude: '',
    locationAccuracy: '',
    locationSource: '',
    locationCapturedAt: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadOwners = async () => {
      try {
        const response = await apiClient.get('/users/directory');
        const usersList = response.data?.data || [];
        setOwners(usersList.map((u: any) => ({ label: u.name || u.username, value: String(u.id || u._id) })));
      } catch (err) {
        console.error('Failed to load owners:', err);
      }
    };
    const loadCustomers = async () => {
      try {
        const response = await apiClient.get('/customers');
        const data = response.data?.data || [];
        setCustomers(data);
      } catch (err) {
        console.error('Failed to load customers:', err);
      }
    };
    loadOwners();
    loadCustomers();
  }, []);

  useEffect(() => {
    if (user?.id && !form.ownerId) {
      setForm(prev => ({ ...prev, ownerId: String(user.id) }));
    }
  }, [user?.id, form.ownerId]);

  const handleCustomerSelect = (custId: string) => {
    setSelectedCustomerId(custId);
    const customer = customers.find((c: any) => c.id === custId || c._id === custId);
    if (customer) {
      setForm((prev) => ({
        ...prev,
        customerName: customer.customerName || customer.name || '',
        customerMobile: customer.phone || customer.mobile || '',
        customerEmail: customer.email || '',
        customerCompany: customer.companyName || customer.company || customer.customerCompany || customer.customerName || '',
      }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next.customerName;
        delete next.customerMobile;
        delete next.customerEmail;
        delete next.customerCompany;
        return next;
      });
    }
  };

  const update = <K extends keyof SupportForm>(key: K, value: SupportForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validateStep1 = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.customerName.trim()) nextErrors.customerName = 'Required';
    if (!form.customerMobile.trim()) nextErrors.customerMobile = 'Required';
    if (!form.customerEmail.trim()) {
      nextErrors.customerEmail = 'Required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail.trim())) {
      nextErrors.customerEmail = 'Invalid email address';
    }
    if (!form.customerCompany.trim()) nextErrors.customerCompany = 'Required';
    if (!form.requestType) nextErrors.requestType = 'Required';
    return nextErrors;
  };

  const validateStep2 = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.ownerId) nextErrors.ownerId = 'Required';
    if (!form.description.trim()) nextErrors.description = 'Required';
    return nextErrors;
  };

  const validateStep3 = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.locationName.trim()) nextErrors.locationName = 'Required';
    if (!form.address.trim()) nextErrors.address = 'Required';
    if (!form.country.trim()) nextErrors.country = 'Required';
    if (!form.state.trim()) nextErrors.state = 'Required';
    if (!form.city.trim()) nextErrors.city = 'Required';
    return nextErrors;
  };

  const validateStep4 = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.contactPerson.trim()) nextErrors.contactPerson = 'Required';
    return nextErrors;
  };

  const fetchLiveGPS = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Allow location access to use Live GPS.');
        setIsLocating(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${latitude}&lon=${longitude}`,
        { headers: { 'User-Agent': 'SwatiCRM-MobileApp/1.0' } }
      );
      if (!res.ok) throw new Error('Failed to reverse geocode');

      const data = await res.json();
      const address = data.address || {};
      
      const city = address.city || address.town || address.village || address.county || '';
      const locationName = data.name || address.building || address.office || address.road || city || '';
      
      const houseNumber = address.house_number || address.housenumber;
      const road = address.road || address.street;
      const streetAddress = (houseNumber && road) ? `${houseNumber} ${road}` : (road || data.display_name || '');

      setForm(prev => ({
        ...prev,
        locationName,
        address: streetAddress,
        city: city,
        state: address.state || '',
        country: address.country || '',
        zipCode: address.postcode || '',
        latitude: String(latitude),
        longitude: String(longitude),
        locationAccuracy: String(location.coords.accuracy || ''),
        locationSource: 'live-location',
        locationCapturedAt: new Date().toISOString(),
      }));

      // Clear errors for auto-filled fields
      setErrors(prev => {
        const next = { ...prev };
        if (locationName) delete next.locationName;
        if (streetAddress) delete next.address;
        if (city) delete next.city;
        if (address.state) delete next.state;
        if (address.country) delete next.country;
        return next;
      });
      
    } catch (err) {
      console.error('Live GPS Error:', err);
      Alert.alert('Error', 'Unable to fetch current location.');
    } finally {
      setIsLocating(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (!result.canceled && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      console.error('File picker error:', err);
    }
  };

  const submitRequest = async (data: SupportForm) => {
    try {
      const customer = customers.find((c: any) => c.id === selectedCustomerId || c._id === selectedCustomerId);
      const owner = owners.find(o => o.value === data.ownerId);

      const payload = {
        customerId: selectedCustomerId,
        customerNumber: customer?.customerNumber || '',
        customerNo: customer?.customerNumber || '',
        requestType: data.requestType,
        subject: data.title.trim() || `${data.requestType || 'Service Request'} - ${data.customerName.trim()}`,
        title: data.title.trim() || `${data.requestType || 'Service Request'} - ${data.customerName.trim()}`,
        description: data.description.trim(),
        status: 'open',
        customerName: data.customerName.trim(),
        customerEmail: data.customerEmail.trim(),
        customerPhone: data.contactPhone.trim(),
        customerMobile: data.customerMobile.trim(),
        customerCompany: data.customerCompany.trim(),
        state: data.state.trim(),
        city: data.city.trim(),
        address: data.address.trim(),
        zipCode: data.zipCode?.trim() || '',
        contactPerson: data.contactPerson.trim(),
        contactDesignation: data.contactDesignation?.trim() || '',
        contactEmail: data.contactEmail?.trim() || '',
        contactPhone: data.contactPhone?.trim() || '',
        contactMobile: data.contactPhone?.trim() || '',
        ownerId: data.ownerId,
        ownerName: owner?.label || user?.name || '',
        attachmentNames: selectedFile ? [selectedFile.name] : [],
        notes: data.internalNotes.trim(),
        locationName: data.locationName.trim(),
        country: data.country.trim(),
        latitude: data.latitude || '',
        longitude: data.longitude || '',
        locationAccuracy: data.locationAccuracy || '',
        locationCapturedAt: data.locationCapturedAt || '',
        locationSource: data.locationSource || 'manual',
        addedByName: user?.name || '',
        userId: String(user?.id || '')
      };

      await apiClient.post('/support-requests', payload);
      Alert.alert('Success', 'Successfully created Support Request', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      console.error('Submit error:', err.response?.data || err.message);
      Alert.alert('Error', 'Failed to create support request');
    }
  };

  const handleNext = () => {
    if (step === 1) {
      const stepErrors = validateStep1();
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return;
      }
    } else if (step === 2) {
      const stepErrors = validateStep2();
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return;
      }
    } else if (step === 3) {
      const stepErrors = validateStep3();
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return;
      }
    } else if (step === 4) {
      const stepErrors = validateStep4();
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        return;
      }
    }

    if (step < 4) {
      setStep((val) => val + 1);
    } else {
      submitRequest(form);
    }
  };

  const SectionTitle = ({ children, rightElement }: { children: React.ReactNode, rightElement?: React.ReactNode }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {rightElement}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        <WizardHeader currentStep={step} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && (
            <>
              <SectionTitle>Customer Details</SectionTitle>
              <SelectField
                label="Select Customer (Auto-fill)"
                options={customers.map(c => ({
                  label: c.customerName || c.name || 'Unknown',
                  value: c.id || c._id
                }))}
                value={selectedCustomerId}
                onChange={handleCustomerSelect}
                placeholder="Choose a customer..."
              />
              <FormField
                label="Customer Name"
                required
                value={form.customerName}
                onChangeText={(val) => update('customerName', val)}
                error={errors.customerName}
              />
              <FormField
                label="Mobile Number"
                required
                keyboardType="phone-pad"
                value={form.customerMobile}
                onChangeText={(val) => update('customerMobile', val)}
                error={errors.customerMobile}
              />
              <FormField
                label="Email"
                required
                keyboardType="email-address"
                autoCapitalize="none"
                value={form.customerEmail}
                onChangeText={(val) => update('customerEmail', val)}
                error={errors.customerEmail}
              />
              <FormField
                label="Company Name"
                required
                value={form.customerCompany}
                onChangeText={(val) => update('customerCompany', val)}
                error={errors.customerCompany}
              />
              <SelectField
                label="SR Type / Complaint Type"
                required
                value={form.requestType}
                options={SUPPORT_REQUEST_TYPE_OPTIONS}
                onChange={(val) => update('requestType', val)}
                error={errors.requestType}
              />
            </>
          )}

          {step === 2 && (
            <>
              <SectionTitle>SR Details</SectionTitle>
              <SelectField
                label="Owner"
                required
                value={form.ownerId}
                options={owners}
                onChange={(val) => update('ownerId', val)}
                error={errors.ownerId}
              />
              <FormField
                label="Title"
                value={form.title}
                onChangeText={(val) => update('title', val)}
                error={errors.title}
              />
              <FormField
                label="Description"
                required
                multiline
                value={form.description}
                onChangeText={(val) => update('description', val)}
                error={errors.description}
              />
              <FormField
                label="Internal Notes"
                multiline
                value={form.internalNotes}
                onChangeText={(val) => update('internalNotes', val)}
                error={errors.internalNotes}
              />
              <View style={styles.attachmentSection}>
                <Text style={styles.attachmentLabel}>File Attachments</Text>
                <TouchableOpacity style={styles.browseButton} onPress={pickDocument}>
                  <Feather name="upload" size={16} color={colors.primary} />
                  <Text style={styles.browseButtonText}>Browse files...</Text>
                </TouchableOpacity>
                <Text style={styles.attachmentPlaceholder}>
                  {selectedFile ? selectedFile.name : 'No file selected'}
                </Text>
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <SectionTitle 
                rightElement={
                  <TouchableOpacity 
                    style={styles.gpsButton} 
                    onPress={fetchLiveGPS}
                    disabled={isLocating}
                  >
                    {isLocating ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <Feather name="map-pin" size={14} color={colors.primary} />
                        <Text style={styles.gpsButtonText}>Live GPS</Text>
                      </>
                    )}
                  </TouchableOpacity>
                }
              >
                Location
              </SectionTitle>
              <FormField
                label="Location Name"
                required
                value={form.locationName}
                onChangeText={(val) => update('locationName', val)}
                error={errors.locationName}
              />
              <FormField
                label="Address"
                required
                multiline
                value={form.address}
                onChangeText={(val) => update('address', val)}
                error={errors.address}
              />
              <FormField
                label="Country"
                required
                value={form.country}
                onChangeText={(val) => update('country', val)}
                error={errors.country}
              />
              <FormField
                label="State"
                required
                value={form.state}
                onChangeText={(val) => update('state', val)}
                error={errors.state}
              />
              <FormField
                label="City"
                required
                value={form.city}
                onChangeText={(val) => update('city', val)}
                error={errors.city}
              />
            </>
          )}

          {step === 4 && (
            <>
              <SectionTitle>Contact</SectionTitle>
              <FormField
                label="Contact Name"
                required
                value={form.contactPerson}
                onChangeText={(val) => update('contactPerson', val)}
                error={errors.contactPerson}
              />
            </>
          )}

        </ScrollView>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => step > 1 ? setStep(step - 1) : router.back()}
        >
          <Text style={styles.secondaryButtonText}>
            {step === 1 ? 'Cancel' : 'Previous'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
          <Text style={styles.primaryButtonText}>
            {step === 4 ? 'Save' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.primary,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  gpsButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  attachmentSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  attachmentLabel: {
    ...typography.caption,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: 'rgba(198, 40, 40, 0.05)',
    gap: 8,
    marginBottom: 8,
  },
  browseButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  attachmentPlaceholder: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  secondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  primaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
