import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WizardHeader } from './WizardHeader';
import { FormField } from './FormField';
import { SelectField } from './SelectField';
import { DateField } from './DateField';
import { AccountForm } from '../../types/account';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { Alert, BackHandler } from 'react-native';
import { router } from 'expo-router';
import apiClient from '../../api/client';
import {
  ACCOUNT_CATEGORY_OPTIONS,
  CUSTOMER_TYPE_OPTIONS,
  INDUSTRY_TYPE_OPTIONS,
  STATE_OPTIONS,
  REMINDER_MODE_OPTIONS,
} from '../../utils/constants';

const formatDateLocal = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface AccountWizardRef {
  stepBack: () => boolean;
}

export const AccountWizard = React.forwardRef<AccountWizardRef, { onNavigateBack?: () => void; onStepChange?: (step: number) => void }>(
  ({ onNavigateBack, onStepChange }, ref) => {
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
  const [form, setForm] = useState<AccountForm>({
    accountName: '',
    accountCategory: '',
    accountOwner: '',
    state: '',
    description: '',
    address: '',
    accountDate: formatDateLocal(new Date()),
    accountSource: '',
    customerName: '',
    consultantName: '',
    customerType: '',
    customerRefNo: '',
    customerRefDate: '',
    industryType: '',
    projectName: '',
    architectName: '',
    pmcName: '',
    contactPerson: '',
    contactDesignation: '',
    contactEmail: '',
    contactPhone: '',
    contactMobile: '',
    reminderDate: '',
    reminderMode: '',
    remark: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [swatiUsers, setSwatiUsers] = useState<string[]>([]);
  const [lumosUsers, setLumosUsers] = useState<string[]>([]);

  React.useEffect(() => {
    const loadOwners = async () => {
      try {
        const response = await apiClient.get('/users/directory');
        const users = response.data?.data || [];
        setSwatiUsers(users.filter((u: any) => u.company === 'swati' && u.ownerCode).map((u: any) => u.name));
        setLumosUsers(users.filter((u: any) => u.company === 'lumos' && u.ownerCode).map((u: any) => u.name));
      } catch (err) {
        console.error('Failed to load owners:', err);
      }
    };
    loadOwners();
  }, []);

  const activeOwners = form.accountCategory === 'LUMOS' ? lumosUsers : form.accountCategory === 'SWATI' ? swatiUsers : [];

  const update = <K extends keyof AccountForm>(key: K, value: AccountForm[K]) => {
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
    if (!form.accountName.trim()) nextErrors.accountName = 'Required';
    if (!form.accountCategory) nextErrors.accountCategory = 'Required';
    if (!form.accountOwner) nextErrors.accountOwner = 'Required';
    if (!form.state) nextErrors.state = 'Required';
    if (!form.accountDate) nextErrors.accountDate = 'Required';
    if (!form.accountSource) nextErrors.accountSource = 'Required';
    if (!form.industryType) nextErrors.industryType = 'Required';
    return nextErrors;
  };

  const submitAccount = async (data: AccountForm) => {
    try {
      const res = await apiClient.post('/leads', data);
      const createdLead = res.data?.data;
      
      if (createdLead && (data.reminderDate || data.remark)) {
        await apiClient.post('/reminders', {
          title: 'Account Follow-up',
          message: data.remark?.trim() || '',
          remindAt: data.reminderDate ? new Date(`${data.reminderDate}T10:00:00`).toISOString() : new Date().toISOString(),
          status: 'scheduled',
          relatedEntityType: 'account',
          relatedEntityId: createdLead.id,
          assignedTo: data.accountOwner,
          reminderDate: data.reminderDate,
          reminderTime: '10:00',
          reminderMode: data.reminderMode,
        }).catch((err) => console.log('Failed to create reminder', err));
      }

      Alert.alert('Success', 'Successfully Created Account', [
        { 
          text: 'OK', 
          onPress: () => {
            if (onNavigateBack) {
              onNavigateBack();
            } else if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/leads');
            }
          } 
        }
      ]);
    } catch (err) {
      console.error('Submit error:', err);
      Alert.alert('Error', 'Failed to create account');
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

    if (step < 4) {
      setStep((val) => val + 1);
    } else {
      console.log('SUBMIT', form);
      submitAccount(form);
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
              <SectionTitle>Account Basic Details</SectionTitle>
              <FormField
                label="Account Name"
                required
                value={form.accountName}
                onChangeText={(val) => update('accountName', val)}
                error={errors.accountName}
              />
              <SelectField
                label="Vertical Name"
                required
                value={form.accountCategory}
                options={ACCOUNT_CATEGORY_OPTIONS}
                onChange={(val) => update('accountCategory', val)}
                error={errors.accountCategory}
              />
              <SelectField
                label="Account Owner"
                required
                value={form.accountOwner}
                options={activeOwners}
                onChange={(val) => update('accountOwner', val)}
                error={errors.accountOwner}
              />
              <SelectField
                label="State"
                required
                value={form.state}
                options={STATE_OPTIONS}
                onChange={(val) => update('state', val)}
                error={errors.state}
              />
              <FormField
                label="Remark"
                multiline
                value={form.description}
                onChangeText={(val) => update('description', val)}
              />
              <FormField
                label="Address"
                multiline
                value={form.address}
                onChangeText={(val) => update('address', val)}
              />
              <DateField
                label="Account Date"
                required
                value={form.accountDate}
                onChange={(date) => update('accountDate', formatDateLocal(date))}
                error={errors.accountDate}
              />
              <SelectField
                label="Account Source"
                required
                value={form.accountSource}
                options={['CALL', 'E-MAIL', 'Internal', 'SOCIAL MEDIA', 'Website']}
                onChange={(val) => update('accountSource', val)}
                error={errors.accountSource}
              />
              <FormField
                label="Customer Name"
                value={form.customerName}
                onChangeText={(val) => update('customerName', val)}
              />
              <FormField
                label="Consultant/AR Name"
                value={form.consultantName}
                onChangeText={(val) => update('consultantName', val)}
              />
              <SelectField
                label="Customer Type"
                value={form.customerType}
                options={CUSTOMER_TYPE_OPTIONS}
                onChange={(val) => update('customerType', val)}
              />
              <FormField
                label="Inquiry Ref No."
                value={form.customerRefNo}
                onChangeText={(val) => update('customerRefNo', val)}
              />
              <DateField
                label="Inquiry Ref Date"
                value={form.customerRefDate}
                onChange={(date) => update('customerRefDate', formatDateLocal(date))}
              />
              <SelectField
                label="Industry Type"
                required
                value={form.industryType}
                options={INDUSTRY_TYPE_OPTIONS}
                onChange={(val) => update('industryType', val)}
                error={errors.industryType}
              />
            </>
          )}

          {step === 2 && (
            <>
              <SectionTitle>Project Details</SectionTitle>
              <FormField
                label="Project Name"
                value={form.projectName}
                onChangeText={(val) => update('projectName', val)}
              />
              <FormField
                label="Architect / Consultant"
                value={form.architectName}
                onChangeText={(val) => update('architectName', val)}
              />
              <FormField
                label="PMC Name"
                value={form.pmcName}
                onChangeText={(val) => update('pmcName', val)}
              />
            </>
          )}

          {step === 3 && (
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
                label="Contact Email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={form.contactEmail}
                onChangeText={(val) => update('contactEmail', val)}
              />
              <FormField
                label="Contact Phone"
                keyboardType="phone-pad"
                value={form.contactPhone}
                onChangeText={(val) => update('contactPhone', val)}
              />
              <FormField
                label="Contact Mobile"
                keyboardType="phone-pad"
                value={form.contactMobile}
                onChangeText={(val) => update('contactMobile', val)}
              />
            </>
          )}

          {step === 4 && (
            <>
              <SectionTitle>Reminder & Remark</SectionTitle>
              <DateField
                label="Reminder Date"
                value={form.reminderDate}
                onChange={(date) => update('reminderDate', formatDateLocal(date))}
              />
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
            title={step === 4 ? 'Save' : 'Next  ›'}
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
});
