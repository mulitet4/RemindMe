import React from "react";
import { Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

const AnimatedPressable = ({ children, style, onPress, ...props }) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  const handlePressIn = () => {
    translateX.value = withSpring(2, { stiffness: 600, damping: 15 });
    translateY.value = withSpring(2, { stiffness: 600, damping: 15 });
  };

  const handlePressOut = () => {
    translateX.value = withSpring(0, { stiffness: 600, damping: 15 });
    translateY.value = withSpring(0, { stiffness: 600, damping: 15 });
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        delayPressIn={0}
        delayPressOut={0}
        {...props}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

export default AnimatedPressable;
