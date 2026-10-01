import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WizardHeader } from '../accounts/WizardHeader';
import { FormField } from '../accounts/FormField';
import { SelectField } from '../accounts/SelectField';
import { HorizontalDateSelector } from '../reminders/HorizontalDateSelector';
import { CalendarModal } from '../calendar/CalendarModal';
import { format } from 'date-fns';
import { CustomerForm } from '../../types/customer';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { Alert, BackHandler } from 'react-native';
import { router } from 'expo-router';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  ACCOUNT_CATEGORY_OPTIONS,
  REMINDER_MODE_OPTIONS,
} from '../../utils/constants';
import { getCrmOwnerCode, getCrmOwnerDisplay } from '../../utils/crmUserDirectory';

const formatDateLocal = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface CustomerWizardRef {
  stepBack: () => boolean;
}

export const CustomerWizard = React.forwardRef<CustomerWizardRef, { onNavigateBack?: () => void; onStepChange?: (step: number) => void }>(
  ({ onNavigateBack, onStepChange }, ref) => {
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState(1);

    React.useImperativeHandle(ref, () => ({
      stepBack: () => {
        if (step > 1) {
          setStep((prev) => prev - 1);
          return true;
        }
        return false;
      },
    }));

    React.useEffect(() => {
      if (onStepChange) {
        onStepChange(step);
      }
    }, [step, onStepChange]);

    React.useEffect(() => {
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
  const [form, setForm] = useState<CustomerForm>({
    customerName: '',
    customerCategory: '',
    customerOwner: '',
    addedDate: formatDateLocal(new Date()),
    address: '',
    contactPerson: '',
    contactDesignation: '',
    contactMobile: '',
    contactEmail: '',
    reminderDate: '',
    reminderMode: '',
    remark: '',
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [swatiUsers, setSwatiUsers] = useState<{label: string, value: string}[]>([]);
  const [lumosUsers, setLumosUsers] = useState<{label: string, value: string}[]>([]);
  const [showAddedDateModal, setShowAddedDateModal] = useState(false);
  const [showReminderDateModal, setShowReminderDateModal] = useState(false);

  React.useEffect(() => {
    const loadOwners = async () => {
      try {
        const response = await apiClient.get('/users/directory');
        const users = response.data?.data || [];
        setSwatiUsers(users.filter((u: any) => u.company === 'swati' && u.ownerCode).map((u: any) => ({ label: u.name, value: u.name })));
        setLumosUsers(users.filter((u: any) => u.company === 'lumos' && u.ownerCode).map((u: any) => ({ label: u.name, value: u.name })));
      } catch (err) {
        console.error('Failed to load owners:', err);
      }
    };
    loadOwners();
  }, []);

  const activeOwners = form.customerCategory === 'LUMOS' ? lumosUsers : form.customerCategory === 'SWATI' ? swatiUsers : [];

  const update = <K extends keyof CustomerForm>(key: K, value: CustomerForm[K]) => {
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
    if (!form.customerCategory) nextErrors.customerCategory = 'Required';
    if (!form.customerOwner) nextErrors.customerOwner = 'Required';
    if (!form.addedDate) nextErrors.addedDate = 'Required';
    return nextErrors;
  };

  const submitCustomer = async (data: CustomerForm) => {
    try {
      const selectedOwner = data.customerOwner || '';
      const ownerCode = getCrmOwnerCode(selectedOwner);
      const ownerDisplay = getCrmOwnerDisplay(selectedOwner);

      console.log('==================== [MOBILE CUSTOMER CREATION START] ====================');
      console.log('[1. Raw Mobile Form State]:', JSON.stringify(data, null, 2));
      console.log('[2. Selected Customer Owner]:', selectedOwner);
      console.log('[3. Resolved Owner Code]:', ownerCode);
      console.log('[4. Resolved Owner Display]:', ownerDisplay);

      const actorUserId = user?.id || (user as any)?._id || (user as any)?.userId || '';
      const actorUserName = user?.name || user?.username || user?.email || '';

      const payload = {
        ...data,
        name: data.customerName,
        customerName: data.customerName,
        company: data.customerName,
        phone: data.contactMobile || (data as any).contactPhone || '',
        email: data.contactEmail || '',
        address: data.address || '',
        customerCategory: data.customerCategory,
        customerOwner: selectedOwner,
        customerOwnerName: selectedOwner,
        customerOwnerCode: ownerCode,
        customerOwnerDisplay: ownerDisplay,
        ownerCode: ownerCode,
        assignedTo: selectedOwner,
        ownerUserId: actorUserId,
        assignedUserId: actorUserId,
        userId: actorUserId,
        createdBy: actorUserId,
        addedBy: actorUserName,
        addedByName: user?.name || actorUserName,
        ownerName: selectedOwner,
        assignedToName: selectedOwner,
        status: 'active',
        customerStatus: 'New',
        formType: 'customer',
        contacts: [
          {
            id: 'primary-contact',
            contactPerson: data.contactPerson,
            phone: data.contactMobile || (data as any).contactPhone || '',
            mobile: data.contactMobile || (data as any).contactPhone || '',
            email: data.contactEmail || '',
            designation: data.contactDesignation || '',
          }
        ]
      };

      console.log('[5. Formatted POST /customers Payload]:', JSON.stringify(payload, null, 2));

      const res = await apiClient.post('/customers', payload);
      console.log('[6. POST /customers Response Status]:', res.status);
      console.log('[7. POST /customers Response Data]:', JSON.stringify(res.data, null, 2));

      const createdCustomer = res.data?.data;
      
      if (createdCustomer && (data.reminderDate || data.remark)) {
        const reminderPayload = {
          title: 'Customer Follow-up',
          message: data.remark?.trim() || '',
          remindAt: data.reminderDate ? new Date(`${data.reminderDate}T10:00:00`).toISOString() : new Date().toISOString(),
          status: 'scheduled',
          relatedEntityType: 'customer',
          relatedEntityId: createdCustomer.id,
          assignedTo: selectedOwner,
          reminderDate: data.reminderDate,
          reminderTime: '10:00',
          reminderMode: data.reminderMode,
        };

        console.log('[8. Formatted POST /reminders Payload]:', JSON.stringify(reminderPayload, null, 2));
        const reminderRes = await apiClient.post('/reminders', reminderPayload).catch((err) => {
          console.log('[9. POST /reminders Failed]:', err?.message || err);
          return null;
        });

        if (reminderRes) {
          console.log('[9. POST /reminders Response Data]:', JSON.stringify(reminderRes.data, null, 2));
        }
      }

      console.log('==================== [MOBILE CUSTOMER CREATION END] ======================');

      Alert.alert('Success', 'Successfully Created Customer', [
        { 
          text: 'OK', 
          onPress: () => {
            if (onNavigateBack) {
              onNavigateBack();
            } else if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/customers');
            }
          } 
        }
      ]);
    } catch (err: any) {
      console.error('Submit error:', err);
      console.log('==================== [MOBILE CUSTOMER CREATION FAILED] ===================');
      Alert.alert('Error', 'Failed to create customer');
    }
  };

  const handleNext = () => {
    if (step === 1) {
      const step1Errors = validateStep1();
      if (Object.keys(step1Errors).length > 0) {
        setErrors(step1Errors);
        return;
      }
    }

    if (step < 3) {
      setStep((val) => val + 1);
    } else {
      console.log('SUBMIT', form);
      submitCustomer(form);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <WizardHeader currentStep={step} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && (
            <>
              <SectionTitle>Customer Basic Details</SectionTitle>
              <FormField
                label="Customer Name"
                required
                value={form.customerName}
                onChangeText={(val) => update('customerName', val)}
                error={errors.customerName}
              />
              <SelectField
                label="Vertical Name"
                required
                value={form.customerCategory}
                options={ACCOUNT_CATEGORY_OPTIONS}
                onChange={(val) => update('customerCategory', val)}
                error={errors.customerCategory}
              />
              <SelectField
                label="Customer Owner"
                required
                value={form.customerOwner}
                options={activeOwners}
                onChange={(val) => update('customerOwner', val)}
                error={errors.customerOwner}
              />
              <View style={styles.dateSection}>
                <View style={styles.dateHeader}>
                  <Text style={styles.dateLabel}>Added Date <Text style={styles.required}>*</Text></Text>
                  <TouchableOpacity onPress={() => setShowAddedDateModal(true)}>
                    <Text style={styles.dateValue}>
                      {form.addedDate ? format(new Date(form.addedDate), 'dd-MM-yyyy') : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
                <HorizontalDateSelector 
                  selectedDate={form.addedDate || formatDateLocal(new Date())} 
                  onSelectDate={(date) => update('addedDate', date)} 
                />
                {!!errors.addedDate && <Text style={styles.errorText}>{errors.addedDate}</Text>}
                
                {showAddedDateModal && (
                  <CalendarModal
                    visible={showAddedDateModal}
                    onClose={() => setShowAddedDateModal(false)}
                    selectedDate={form.addedDate ? new Date(form.addedDate) : new Date()}
                    onSelectDate={(date) => {
                      update('addedDate', formatDateLocal(date));
                      setShowAddedDateModal(false);
                    }}
                    reminders={[]}
                    position="center"
                  />
                )}
              </View>
              <FormField
                label="Address"
                multiline
                value={form.address}
                onChangeText={(val) => update('address', val)}
              />
            </>
          )}

          {step === 2 && (
            <>
              <SectionTitle>Contacts</SectionTitle>
              <FormField
                label="Contact Person"
                value={form.contactPerson}
                onChangeText={(val) => update('contactPerson', val)}
              />
              <FormField
                label="Designation"
                value={form.contactDesignation}
                onChangeText={(val) => update('contactDesignation', val)}
              />
              <FormField
                label="Contact Mobile"
                keyboardType="phone-pad"
                value={form.contactMobile}
                onChangeText={(val) => update('contactMobile', val)}
              />
              <FormField
                label="Contact Email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={form.contactEmail}
                onChangeText={(val) => update('contactEmail', val)}
              />
            </>
          )}

          {step === 3 && (
            <>
              <SectionTitle>Reminder & Remarks</SectionTitle>
              <View style={styles.dateSection}>
                <View style={styles.dateHeader}>
                  <Text style={styles.dateLabel}>Reminder Date</Text>
                  <TouchableOpacity onPress={() => setShowReminderDateModal(true)}>
                    <Text style={styles.dateValue}>
                      {form.reminderDate ? format(new Date(form.reminderDate), 'dd-MM-yyyy') : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
                <HorizontalDateSelector 
                  selectedDate={form.reminderDate || new Date().toISOString()} 
                  onSelectDate={(date) => update('reminderDate', date.split('T')[0])} 
                />
                
                {showReminderDateModal && (
                  <CalendarModal
                    visible={showReminderDateModal}
                    onClose={() => setShowReminderDateModal(false)}
                    selectedDate={form.reminderDate ? new Date(form.reminderDate) : new Date()}
                    onSelectDate={(date) => {
                      update('reminderDate', formatDateLocal(date));
                      setShowReminderDateModal(false);
                    }}
                    reminders={[]}
                    position="center"
                  />
                )}
              </View>
              <SelectField
                label="Reminder Mode"
                value={form.reminderMode}
                options={REMINDER_MODE_OPTIONS}
                onChange={(val) => update('reminderMode', val)}
              />
              <FormField
                label="Remark"
                multiline
                value={form.remark}
                onChangeText={(val) => update('remark', val)}
              />
              <FormField
                label="Description"
                multiline
                value={form.description}
                onChangeText={(val) => update('description', val)}
              />
            </>
          )}
        </ScrollView>

        <View style={[styles.buttons, { paddingBottom: Math.max(insets.bottom, 18) }]}>
          <Button
            title="‹  Prev"
            secondary
            disabled={step === 1}
            onPress={() => setStep((val) => Math.max(1, val - 1))}
          />
          <Button
            title={step === 3 ? 'Save' : 'Next  ›'}
            onPress={handleNext}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
);

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
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  card: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionContainer: {
    marginBottom: 18,
  },
  sectionText: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  button: {
    height: 38,
    minWidth: 105,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  buttonText: {
    ...typography.subtitle,
  },
  buttonTextPrimary: {
    color: colors.white,
  },
  buttonTextSecondary: {
    color: colors.primary,
  },
  dateSection: {
    marginBottom: 14,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  dateValue: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  required: {
    color: colors.primary,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: 4,
  },
});
