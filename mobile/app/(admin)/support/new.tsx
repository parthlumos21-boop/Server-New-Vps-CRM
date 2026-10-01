import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppHeader } from '../../../src/components/ui/AppHeader';
import { SupportRequestWizard } from '../../../src/components/support/SupportRequestWizard';
import { router } from 'expo-router';
import { colors } from '../../../src/theme/colors';

export default function NewSupportRequestScreen() {
  return (
    <View style={styles.container}>
      <AppHeader 
        title="New Request" 
        showBack 
        onBack={() => router.back()} 
      />
      <SupportRequestWizard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
});
