import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';

interface ThreeCircleLottieProps {
  width?: number;
  height?: number;
  style?: ViewStyle;
}

export function ThreeCircleLottie({ width = 120, height = 90, style }: ThreeCircleLottieProps) {
  return (
    <View style={[styles.container, { width, height }, style]}>
      <LottieView
        autoPlay
        loop
        source={require('../../assets/three-circles.json')}
        style={styles.animation}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  animation: {
    width: '100%',
    height: '100%',
  },
});
