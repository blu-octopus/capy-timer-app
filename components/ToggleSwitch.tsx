/**
 * ? Toggle Switch Component
 * 
 * A customizable toggle switch for settings like prep phase on/off.
 * Follows iOS design patterns with smooth animations.
 */

import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { Typography } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ToggleSwitchProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  style?: any;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  isEnabled,
  onToggle,
  label,
  description,
  disabled = false,
  style,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // Animation for the toggle knob
  const animatedValue = React.useRef(new Animated.Value(isEnabled ? 1 : 0)).current;
  
  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isEnabled ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isEnabled, animatedValue]);

  const handlePress = () => {
    if (!disabled) {
      onToggle(!isEnabled);
    }
  };

  // Calculate knob position
  const knobTranslateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 26], // Adjust based on switch width
  });

  // Calculate background color
  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.text + '30', colors.accent], // 30% opacity for off state
  });

  return (
    <View style={[styles.container, style]}>
      {/* Label and Description */}
      {(label || description) && (
        <View style={styles.textContainer}>
          {label && (
            <Text style={[styles.label, { color: colors.text }]}>
              {label}
            </Text>
          )}
          {description && (
            <Text style={[styles.description, { color: colors.text }]}>
              {description}
            </Text>
          )}
        </View>
      )}

      {/* Toggle Switch */}
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        style={[
          styles.switchContainer,
          disabled && styles.disabled,
        ]}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.switch,
            {
              backgroundColor,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.knob,
              {
                backgroundColor: colors.surface,
                transform: [{ translateX: knobTranslateX }],
              },
            ]}
          />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },

  textContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },

  label: {
    ...Typography.callout,
    marginBottom: Spacing.xs2,
  },

  description: {
    ...Typography.caption1,
    opacity: 0.7,
  },

  switchContainer: {
    padding: Spacing.xs2, // Add padding for easier touch target
  },

  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    position: 'relative',
  },

  knob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },

  disabled: {
    opacity: 0.5,
  },
});
