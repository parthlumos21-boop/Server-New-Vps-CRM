import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LEGAL_URLS } from '../../config/legal';

export default function LegalScreen() {
  const router = useRouter();

  const openLegalPage = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        Alert.alert(
          'Unable to open page',
          'This legal page could not be opened.'
        );
        return;
      }

      await Linking.openURL(url);
    } catch {
      Alert.alert(
        'Unable to open page',
        'Please try again later.'
      );
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Legal',
          headerBackTitle: 'Settings',
        }}
      />

      <View style={styles.container}>

        <View style={styles.header}>
          <Text style={styles.title}>Legal & Privacy</Text>

          <Text style={styles.subtitle}>
            Review Swati CRM's legal information and account policies.
          </Text>
        </View>

        <View style={styles.section}>

          <LegalItem
            icon="shield"
            title="Privacy Policy"
            description="Learn how we collect, use and protect your information."
            onPress={() =>
              openLegalPage(LEGAL_URLS.privacyPolicy)
            }
          />

          <LegalItem
            icon="file-text"
            title="Terms & Conditions"
            description="Review the terms governing your use of Swati CRM."
            onPress={() =>
              openLegalPage(LEGAL_URLS.termsAndConditions)
            }
          />

          <LegalItem
            icon="trash-2"
            title="Account Deletion"
            description="Learn about the account deletion process."
            onPress={() =>
              openLegalPage(LEGAL_URLS.accountDeletion)
            }
          />

        </View>

        <View style={styles.footer}>
          <Text style={styles.brand}>Swati CRM</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
        </View>

      </View>
    </>
  );
}

function LegalItem({
  icon,
  title,
  description,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.item,
        pressed && styles.itemPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.iconContainer}>
        <Feather
          name={icon}
          size={22}
          color="#333"
        />
      </View>

      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>
          {title}
        </Text>

        <Text style={styles.itemDescription}>
          {description}
        </Text>
      </View>

      <Feather
        name="chevron-right"
        size={20}
        color="#999"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 20,
  },

  header: {
    paddingTop: 24,
    paddingBottom: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111',
  },

  subtitle: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    color: '#707070',
  },

  section: {
    gap: 12,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },

  itemPressed: {
    opacity: 0.7,
  },

  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F3F3',
    marginRight: 13,
  },

  itemContent: {
    flex: 1,
    paddingRight: 8,
  },

  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
  },

  itemDescription: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#777',
  },

  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 24,
  },

  brand: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },

  version: {
    marginTop: 4,
    fontSize: 11,
    color: '#999',
  },
});
