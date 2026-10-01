import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface NotificationPayload {
  id: string;
  companyId: number;
  senderId: string;
  receiverId: string;
  message: string;
  notificationType: string;
  entityType: string;
  entityId: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationBannerProps {
  notification: NotificationPayload | null;
  onDismiss: () => void;
}

export function NotificationBanner({ notification, onDismiss }: NotificationBannerProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const slideAnim = React.useRef(new Animated.Value(-150)).current;

  useEffect(() => {
    if (notification) {
      Animated.spring(slideAnim, {
        toValue: insets.top + 10,
        useNativeDriver: true,
        bounciness: 12,
      }).start();

      const timer = setTimeout(() => {
        closeBanner();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  const closeBanner = () => {
    Animated.timing(slideAnim, {
      toValue: -150,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  const handlePress = () => {
    if (!notification) return;
    
    let route = '';
    switch (notification.entityType) {
      case 'deal': route = `/deals/${notification.entityId}`; break;
      case 'account': route = `/accounts/${notification.entityId}`; break;
      case 'task': route = `/tasks/${notification.entityId}`; break;
      case 'customer': route = `/customers/${notification.entityId}`; break;
      case 'message': route = `/messages`; break;
      case 'quotation': route = `/quotations/${notification.entityId}`; break;
      default: break;
    }
    
    if (route) {
      router.push(route as any);
    }
    closeBanner();
  };

  if (!notification) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <Pressable onPress={handlePress} style={styles.pressable}>
        <BlurView intensity={80} tint="light" style={styles.blurView}>
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.appInfo}>
                <Image 
                  source={require('../../assets/images/logo.png')} 
                  style={styles.logo}
                  resizeMode="contain"
                />
                <Text style={styles.appName}>Swati CRM</Text>
              </View>
              <Text style={styles.time}>now</Text>
            </View>
            <View style={styles.body}>
              <Text style={styles.message} numberOfLines={2}>
                {notification.message}
              </Text>
            </View>
          </View>
        </BlurView>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  pressable: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  blurView: {
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  appName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.2,
  },
  time: {
    fontSize: 12,
    color: '#8E8E93',
  },
  body: {
    paddingLeft: 28, // align with text, offset logo
  },
  message: {
    fontSize: 15,
    color: '#1C1C1E',
    lineHeight: 20,
  },
});
