import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { colors } from '../src/theme/colors';


export default function Index() {
  const { isLoading, user } = useAuth();
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    console.log('[IndexScreen] Component Mounted. Checking auth state...');
    return () => console.log('[IndexScreen] Component Unmounted');
  }, [glowAnim]);

  useEffect(() => {
    if (!isLoading) {
      console.log('[IndexScreen] Auth loading complete. Waiting 2.5 seconds...');
      const timer = setTimeout(() => {
        if (user) {
          console.log('[IndexScreen] Navigating to dashboard based on role');
          if (user.role === 'admin') {
            router.replace('/(admin)/dashboard');
          } else {
            router.replace('/(tabs)/dashboard');
          }
        } else {
          console.log('[IndexScreen] Navigating to /login');
          router.replace('/login');
        }
      }, 2500);
      return () => clearTimeout(timer);
    } else {
      console.log('[IndexScreen] Waiting for auth to load...');
    }
  }, [isLoading, user]);

  return (
    <View style={styles.container}>
      <Animated.View style={[
        styles.logoWrapper,
        {
          opacity: glowAnim,
          transform: [{
            scale: glowAnim.interpolate({
              inputRange: [0.4, 1],
              outputRange: [0.95, 1.05]
            })
          }]
        }
      ]}>
        <View style={styles.innerRound}>
          <Image 
            source={require('../assets/images/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  logoWrapper: {
    width: 180,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  innerRound: {
    width: 180,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  logo: {
    width: 180,
    height: 80,
  }
});
