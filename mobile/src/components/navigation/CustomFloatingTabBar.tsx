import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_COUNT = 5;
const CIRCLE_SIZE = 56;

export function CustomFloatingTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;
  const tabWidth = screenWidth / TAB_COUNT;

  // Filter out hidden routes (e.g. href: null)
  const visibleRoutes = state?.routes ? state.routes.filter((r: any) => {
    const opts = descriptors[r.key]?.options;
    return opts?.href !== null;
  }) : [];

  // Active index among visible routes
  const currentRouteKey = state?.routes ? state.routes[state.index]?.key : null;
  const activeVisibleIndex = visibleRoutes.findIndex((r: any) => r.key === currentRouteKey);
  const activeIndex = activeVisibleIndex >= 0 ? activeVisibleIndex : 0;

  // Horizontal animation offset
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const targetPos = (tabWidth * activeIndex) + (tabWidth / 2) - (CIRCLE_SIZE / 2);
    Animated.spring(translateX, {
      toValue: targetPos,
      useNativeDriver: true,
      friction: 7,
      tension: 65,
    }).start();
  }, [activeIndex, tabWidth]);

  // Check if focused screen requested hiding tab bar (e.g. detail screens)
  const currentRoute = state?.routes ? state.routes[state.index] : null;
  const currentOptions = currentRoute ? descriptors[currentRoute.key]?.options : null;
  if (currentOptions?.tabBarStyle && (currentOptions.tabBarStyle as any).display === 'none') {
    return null;
  }

  const isAndroid = Platform.OS === 'android';
  const safeBottom = Math.max(insets.bottom, isAndroid ? 12 : 8);

  return (
    <View style={styles.wrapper}>
      {/* Full-width curved bottom navigation container */}
      <View style={[styles.container, { paddingBottom: safeBottom, height: 64 + safeBottom }]}>
        
        {/* Animated Floating Overlapping Active Circle */}
        {visibleRoutes.length > 0 && (
          <Animated.View
            style={[
              styles.floatingCircle,
              {
                transform: [{ translateX }],
              },
            ]}
          >
            {(() => {
              const activeRoute = visibleRoutes[activeIndex];
              const opts = activeRoute ? descriptors[activeRoute.key]?.options : null;
              return opts?.tabBarIcon ? opts.tabBarIcon({ focused: true, color: '#FFFFFF', size: 24 }) : null;
            })()}
          </Animated.View>
        )}

        {/* 5 Tab Items */}
        <View style={styles.tabsRow}>
          {visibleRoutes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];

            const label = options.title !== undefined
              ? options.title
              : options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : route.name;

            const isFocused = activeIndex === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tabSlot}
                activeOpacity={0.8}
              >
                {/* Empty space at top when focused to accommodate floating circle above */}
                <View style={styles.iconContainer}>
                  {!isFocused && options.tabBarIcon && (
                    options.tabBarIcon({ focused: false, color: '#6B7280', size: 22 })
                  )}
                </View>

                <Text
                  numberOfLines={1}
                  style={[
                    styles.label,
                    isFocused ? styles.activeLabel : styles.inactiveLabel,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  floatingCircle: {
    position: 'absolute',
    top: -24,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#1650C8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1650C8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 12,
    zIndex: 110,
  },
  tabsRow: {
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    alignItems: 'center',
  },
  tabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconContainer: {
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  activeLabel: {
    color: '#1650C8',
    fontWeight: '700',
  },
  inactiveLabel: {
    color: '#6B7280',
    fontWeight: '500',
  },
});
