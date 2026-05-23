import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Colors, FontFamily, FontSize, Radius } from '../../theme';
import { useUIStore } from '../../store/uiStore';

export const RoleSwitcher: React.FC = () => {
  const { currentRole, setRole } = useUIStore();
  const slideAnim = useRef(new Animated.Value(currentRole === 'seeker' ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: currentRole === 'seeker' ? 0 : 1,
      useNativeDriver: false, // width/translateX interpolation requires false for layout spacing
      friction: 8,
      tension: 65,
    }).start();
  }, [currentRole, slideAnim]);

  const handleSwitch = (role: 'seeker' | 'provider') => {
    if (role === currentRole) return;
    setRole(role);
  };

  // Interpolate translate X position
  const leftPosition = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 70], // pill width is ~68px, gap is 2px, container padding is 2px
  });

  return (
    <View style={styles.container}>
      {/* Sliding background pill */}
      <Animated.View style={[styles.pill, { left: leftPosition }]} />

      <TouchableOpacity
        style={styles.btn}
        onPress={() => handleSwitch('seeker')}
        activeOpacity={0.8}
      >
        <Text style={[styles.btnText, currentRole === 'seeker' && styles.btnTextActive]}>
          Seeker
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => handleSwitch('provider')}
        activeOpacity={0.8}
      >
        <Text style={[styles.btnText, currentRole === 'provider' && styles.btnTextActive]}>
          Provider
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)', // Translucent fill for dark UI
    borderRadius: Radius.round ?? 20,
    height: 32,
    width: 142,
    padding: 2,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  pill: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    width: 68,
    backgroundColor: Colors.saffron ?? '#FF6B00',
    borderRadius: Radius.round ?? 18,
    boxShadow: '0px 2px 8px rgba(255,107,0,0.35)',
  },
  btn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  btnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs ?? 11,
    color: 'rgba(255, 255, 255, 0.75)', // White text for dark backdrop
  },
  btnTextActive: {
    color: Colors.white ?? '#FFFFFF',
    fontFamily: FontFamily.headingBold,
  },
});
