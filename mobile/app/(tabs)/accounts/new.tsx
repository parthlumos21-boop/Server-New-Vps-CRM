import React, { useRef, useState } from 'react';
import { AccountWizard, AccountWizardRef } from '../../../src/components/accounts/AccountWizard';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../../src/theme/colors';
import { AppHeader } from '../../../src/components/ui/AppHeader';
import { router } from 'expo-router';
import { useAuth } from '../../../src/context/AuthContext';

export default function NewAccountScreen() {
  const { user } = useAuth();
  const wizardRef = useRef<AccountWizardRef>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const handleNavigateToAccounts = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (user?.role === 'admin') {
      router.replace('/(admin)/leads');
    } else {
      router.replace('/(tabs)/leads');
    }
  };

  const handleHeaderBack = () => {
    if (currentStep > 1) {
      wizardRef.current?.stepBack();
    } else {
      handleNavigateToAccounts();
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Add Account" showBack onBack={handleHeaderBack} />
      <AccountWizard
        ref={wizardRef}
        onNavigateBack={handleNavigateToAccounts}
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
