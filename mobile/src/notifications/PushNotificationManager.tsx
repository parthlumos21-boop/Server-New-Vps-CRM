import { useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import apiClient from '../api/client';
import { NotificationPayload } from './NotificationBanner';
export function PushNotificationManager() {
  const { user } = useAuth();
  const { showNotification } = useSocket();
  const router = useRouter();
  const responseListener = useRef<any>(null);
  const notificationListener = useRef<any>(null);

  useEffect(() => {
    console.log('====================================');
    console.log('[NOTIFICATION DIAGNOSTIC] Runtime Environment:');
    console.log(`[NOTIFICATION] Execution Env: ${Constants.executionEnvironment}`);
    console.log(`[NOTIFICATION] App ownership: ${Constants.appOwnership}`);
    console.log(`[NOTIFICATION] Platform: ${Platform.OS}`);
    console.log(`[NOTIFICATION] Is Device: ${Device.isDevice}`);
    console.log('====================================');

    // SDK 53+ removed remote push notifications from Expo Go. 
    // To prevent the module from throwing a fatal error on load, we skip it entirely in Expo Go.
    if (Constants.appOwnership === 'expo') {
      console.log('Skipping push notifications setup: Not supported in Expo Go.');
      return;
    }

    if (!user) return;

    let Notifications: any;

    async function setupNotifications() {
      console.log('[NOTIFICATION] Initializing push setup...');
      // Dynamically import so the module side-effects don't crash Expo Go
      Notifications = await import('expo-notifications');

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true, // Show OS banner even in foreground to ensure it's visible during testing
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Always register listeners immediately so we don't miss local/FCM events 
      // even if token generation fails later.
      responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
        const data = response.notification.request.content.data;
        if (data?.entityType && data?.entityId) {
          let route = '';
          switch (data.entityType) {
            case 'deal': route = `/deals/${data.entityId}`; break;
            case 'account': route = `/accounts/${data.entityId}`; break;
            case 'task': route = `/tasks/${data.entityId}`; break;
            case 'customer': route = `/customers/${data.entityId}`; break;
            case 'message': route = `/messages`; break;
            case 'quotation': route = `/quotations/${data.entityId}`; break;
            default: break;
          }

          if (route) {
            router.push(route as any);
          }
        }
      });

      // Handle FCM push notifications while app is in the foreground
      notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
        const data = notification.request?.content?.data;
        const title = notification.request?.content?.title || 'New Notification';
        const body = notification.request?.content?.body || '';

        if (data) {
          // Trigger the custom Socket in-app toast
          showNotification({
            ...(data as any),
            message: body || data.message || 'New Notification',
          } as NotificationPayload);
        }
      });

      let token;
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        console.log(`[NOTIFICATION] Permission: ${finalStatus}`);

        if (finalStatus !== 'granted') {
          console.error('[NOTIFICATION] Failed to get push token for push notification! Status:', finalStatus);
          Alert.alert("Permission Denied", "Failed to get push token for push notifications!");
          return;
        }

        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ??
          Constants?.easConfig?.projectId;

        if (!projectId) {
          console.warn("[NOTIFICATION] No EAS project ID found.");
          Alert.alert("Configuration Error", "No EAS project ID found. You must configure it in app.json.");
          return;
        }

        try {
          // ADVANCED DIAGNOSTICS: First fetch the raw Native Device Token (FCM/APNs)
          console.log('[NOTIFICATION] Attempting to fetch RAW Native Device Token (Firebase/APNs)...');
          const nativeToken = await Notifications.getDevicePushTokenAsync();
          console.log(`[NOTIFICATION] SUCCESS! Raw Native Token: ${nativeToken.data}`);
          console.log(`[NOTIFICATION] Native Token Type: ${nativeToken.type}`);
        } catch (nativeErr: any) {
          console.error('[NOTIFICATION] FATAL ERROR: Failed to get RAW Native Device Token!', nativeErr);
          Alert.alert(
            "Firebase Configuration Error",
            "The app failed to communicate with Firebase/Google Cloud Messaging. Please ensure google-services.json is correctly configured in your EAS build.\n\nError: " + nativeErr.message
          );
        }

        try {
          console.log('[NOTIFICATION] Attempting to fetch Expo wrapper token...');
          token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
          console.log(`[NOTIFICATION] SUCCESS! Expo Push Token: ${token}`);
        } catch (error: any) {
          console.error("[NOTIFICATION] Failed to get Expo Push Token:", error);
          Alert.alert("Expo Push Error", "Failed to fetch Expo push token: " + error.message);
          return;
        }
      } else {
        console.log('[NOTIFICATION] Must use physical device for Push Notifications');
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('crm-high-priority', {
          name: 'CRM High Priority',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
        console.log('[NOTIFICATION] Android channel: created (crm-high-priority)');
      }

      if (token) {
        try {
          await apiClient.post('/devices/register', {
            pushToken: token,
            platform: Platform.OS,
            deviceId: Device.modelName || 'Unknown Device',
          });
          console.log('[NOTIFICATION] Token sent to backend successfully.');
        } catch (err: any) {
          console.error('[NOTIFICATION] Failed to register push token to backend:', err);
          Alert.alert("Registration Error", "Failed to register device token to CRM backend.");
        }
      }

      // ADVANCED LOCAL DIAGNOSTIC: Bypassing all clouds.
      // This physically triggers an OS notification from inside the app using the Native OS AlarmManager.
      // If this rings, it proves the Android OS, Notification Channel, and Icon are perfect.
      // If it rings but cloud pushes don't, it proves Expo is missing the Firebase Server Key in EAS.
      if (Device.isDevice && Constants.appOwnership !== 'expo') {
        console.log('[NOTIFICATION] Scheduling Native Local Diagnostic Push for 15 seconds from now...');
        
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "✅ Local Push Working!",
              body: "If you see this on your lock screen, your Android OS is perfect! The cloud failure is caused by missing EAS Firebase Credentials.",
              sound: true,
            },
            trigger: { 
              seconds: 15,
              channelId: 'crm-high-priority',
            }, // Let the native OS handle the timer!
          });
          console.log('\n[NOTIFICATION] ⏰ Native Local Diagnostic Push Scheduled successfully!');
        } catch (e) {
          console.error('[NOTIFICATION] Failed to schedule local push:', e);
        }
      }
    }

    setupNotifications();

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
    };
  }, [user]);

  return null;
}

