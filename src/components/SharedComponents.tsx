import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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

interface BlockInputProps {
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  isPassword?: boolean;
}

export const BlockInput = ({
  icon,
  placeholder,
  value,
  onChangeText,
  isPassword,
}: BlockInputProps) => {
  const [show, setShow] = useState(false);
  return (
    <View style={styles.inputContainer}>
      <View style={styles.iconBox}>
        <FontAwesome5 name={icon} size={16} color={COLORS.textGrey} />
      </View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textLight}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={isPassword && !show}
      />
      {isPassword && (
        <TouchableOpacity onPress={() => setShow(!show)} style={styles.eyeBtn}>
          <FontAwesome5
            name={show ? "eye" : "eye-slash"}
            size={16}
            color={COLORS.textGrey}
          />
        </TouchableOpacity>
      )}
    </View>
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
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.inputBg,
    borderRadius: 16,
    marginBottom: 16,
    height: 56,
    borderWidth: 1,
    borderColor: "transparent",
  },
  iconBox: { width: 48, alignItems: "center", justifyContent: "center" },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    color: COLORS.textDark,
    paddingRight: 16,
  },
  eyeBtn: {
    paddingHorizontal: 16,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});
