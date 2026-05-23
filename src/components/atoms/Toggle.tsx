import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Colors } from '../../theme';

interface ToggleProps {
  value: boolean;
  onToggle: (value: boolean) => void;
  style?: ViewStyle;
}

export const Toggle: React.FC<ToggleProps> = ({ value, onToggle, style }) => {
  const translateX = React.useRef(new Animated.Value(value ? 18 : 2)).current;

  React.useEffect(() => {
    Animated.spring(translateX, {
      toValue: value ? 18 : 2,
      useNativeDriver: true,
      tension: 80,
      friction: 6,
    }).start();
  }, [value, translateX]);

  const handlePress = useCallback(() => {
    onToggle(!value);
  }, [value, onToggle]);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      style={[
        styles.track,
        { backgroundColor: value ? Colors.saffron : Colors.gray3 },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.thumb,
          { transform: [{ translateX }] },
        ]}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  track: {
    width: 40,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
  },
  thumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    boxShadow: "0px 1px 6px rgba(0,0,0,0.15)",
  },
});
