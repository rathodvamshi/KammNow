import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Colors } from '../../theme';

interface MapPinProps {
  isDragging?: boolean;
  size?: number;
}

export const MapPin: React.FC<MapPinProps> = ({ isDragging = false, size = 48 }) => {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(1)).current;

  // Entrance bounce
  useEffect(() => {
    Animated.spring(bounceAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  // Dragging scale
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isDragging ? 1.15 : 1,
      friction: 5,
      tension: 50,
      useNativeDriver: true,
    }).start();

    Animated.spring(shadowAnim, {
      toValue: isDragging ? 1.6 : 1,
      friction: 5,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, [isDragging]);

  const translateY = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-30, 0],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }, { scale: scaleAnim }],
        },
      ]}
    >
      {/* Pin head */}
      <View
        style={[
          styles.pinHead,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        <View style={styles.pinInner} />
      </View>

      {/* Pin tail */}
      <View style={styles.pinTail} />

      {/* Shadow dot on ground */}
      <Animated.View
        style={[
          styles.shadow,
          {
            transform: [{ scaleX: shadowAnim }],
            opacity: shadowAnim.interpolate({
              inputRange: [1, 1.6],
              outputRange: [0.3, 0.1],
            }),
          },
        ]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  pinHead: {
    backgroundColor: Colors.saffron,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
    shadowColor: Colors.saffron,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  pinInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.white,
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.saffron,
    marginTop: -2,
  },
  shadow: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.25)',
    marginTop: 4,
  },
});
