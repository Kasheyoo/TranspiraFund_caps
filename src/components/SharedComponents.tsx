import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import {
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { COLORS } from "../constants";

interface PrimaryButtonProps {
  onPress: () => void;
  title: string;
  style?: ViewStyle;
  icon?: string;
  iconPosition?: "left" | "right";
  disabled?: boolean;
}

export const PrimaryButton = ({
  onPress,
  title,
  style,
  icon,
  iconPosition = "left",
  disabled,
}: PrimaryButtonProps) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => {
        if (!disabled) {
          scale.value = withTiming(0.97, { duration: 80 });
        }
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 100 });
      }}
      onPress={disabled ? undefined : onPress}
    >
      <Animated.View
        style={[styles.button, style, disabled && { opacity: 0.5 }, animatedStyle]}
      >
        <Text style={styles.buttonText}>{title}</Text>
        {icon && (
          <FontAwesome5
            name={icon}
            size={16}
            color="white"
            style={{ position: "absolute", ...(iconPosition === "left" ? { left: 20 } : { right: 20 }) }}
          />
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    elevation: 4,
    position: "relative",
  },
  buttonText: {
    flex: 1,
    color: "white",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
});
