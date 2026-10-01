import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DealWizard, DealWizardRef } from '../../src/components/deals/DealWizard';
import { colors } from '../../src/theme/colors';
import { AppHeader } from '../../src/components/ui/AppHeader';
import { Stack, router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';

export default function NewDealScreen() {
  const { user } = useAuth();
  const wizardRef = useRef<DealWizardRef>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const handleNavigateToDeals = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (user?.role === 'admin') {
      router.replace('/(admin)/deals');
    } else {
      router.replace('/(tabs)/deals');
    }
  };

  const handleHeaderBack = () => {
    if (currentStep > 1) {
      wizardRef.current?.stepBack();
    } else {
      handleNavigateToDeals();
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <AppHeader title="Add Deal" showBack onBack={handleHeaderBack} />
        <DealWizard
          ref={wizardRef}
          onNavigateBack={handleNavigateToDeals}
          onStepChange={setCurrentStep}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

