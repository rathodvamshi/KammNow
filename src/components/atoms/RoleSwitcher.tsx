import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize, Radius, Shadow } from '../../theme';
import { useUIStore } from '../../store/uiStore';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

interface RoleSwitcherProps {
  onSwitchRequest?: (role: 'seeker' | 'provider') => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ onSwitchRequest }) => {
  const { currentRole, setRole } = useUIStore();
  // Local state for immediate visual feedback
  const [localRole, setLocalRole] = useState<'seeker' | 'provider'>(currentRole);
  
  const slideAnim = useRef(new Animated.Value(localRole === 'seeker' ? 0 : 1)).current;

  // Sync with global store if changed externally
  useEffect(() => {
    if (currentRole !== localRole) {
      setLocalRole(currentRole);
    }
  }, [currentRole]);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: localRole === 'seeker' ? 0 : 1,
      useNativeDriver: false,
      friction: 8,
      tension: 65,
    }).start();
  }, [localRole, slideAnim]);

  const handleSwitch = (role: 'seeker' | 'provider') => {
    if (role === localRole) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setLocalRole(role);
    
    if (onSwitchRequest) {
      onSwitchRequest(role);
    } else {
      setRole(role);
    }
  };

  // 176px container width => Each button is 88px. Pill width is 84px.
  // Left padding is 2px. Pill positions: 2px (left) and 176 - 84 - 2 = 90px (right).
  const leftPosition = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 90], 
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.pill, { left: leftPosition }]} />

      <TouchableOpacity
        style={styles.btn}
        onPress={() => handleSwitch('seeker')}
        activeOpacity={0.8}
      >
        <Ionicons 
          name="person" 
          size={14} 
          color={localRole === 'seeker' ? Colors.ink : 'rgba(255, 255, 255, 0.6)'} 
          style={styles.icon}
        />
        <Text style={[styles.btnText, localRole === 'seeker' && styles.btnTextActive]}>
          Seeker
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => handleSwitch('provider')}
        activeOpacity={0.8}
      >
        <Ionicons 
          name="business" 
          size={14} 
          color={localRole === 'provider' ? Colors.ink : 'rgba(255, 255, 255, 0.6)'} 
          style={styles.icon}
        />
        <Text style={[styles.btnText, localRole === 'provider' && styles.btnTextActive]}>
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
    backgroundColor: 'rgba(0, 0, 0, 0.25)', 
    borderRadius: 20,
    height: 36,
    width: 176,
    padding: 2,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pill: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    width: 84,
    backgroundColor: Colors.white,
    borderRadius: 18,
    ...Shadow.sm,
  },
  btn: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  icon: {
    marginRight: 4,
  },
  btnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: 'rgba(255, 255, 255, 0.75)', 
  },
  btnTextActive: {
    color: Colors.ink,
    fontFamily: FontFamily.headingBold,
  },
});
