import React, { useRef, useState } from 'react';
import { CustomerWizard, CustomerWizardRef } from '../../../src/components/customers/CustomerWizard';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../../src/theme/colors';
import { AppHeader } from '../../../src/components/ui/AppHeader';
import { router } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';

export default function NewCustomerScreen() {
  const { user } = useAuth();
  const wizardRef = useRef<CustomerWizardRef>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const handleNavigateToCustomers = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (user?.role === 'admin') {
      router.replace('/(admin)/customers');
    } else {
      router.replace('/(tabs)/customers');
    }
  };

  const handleHeaderBack = () => {
    if (currentStep > 1) {
      wizardRef.current?.stepBack();
    } else {
      handleNavigateToCustomers();
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Add Customer" showBack onBack={handleHeaderBack} />
      <CustomerWizard
        ref={wizardRef}
        onNavigateBack={handleNavigateToCustomers}
        onStepChange={setCurrentStep}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
