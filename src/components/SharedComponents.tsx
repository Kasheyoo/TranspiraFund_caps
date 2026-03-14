import { FontAwesome5 } from "@expo/vector-icons";
import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { COLORS } from "../constants";

interface PrimaryButtonProps {
  onPress: () => void;
  title: string;
  style?: ViewStyle;
  icon?: string;
}

export const PrimaryButton = ({ onPress, title, style, icon }: PrimaryButtonProps) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.button, style]}
    activeOpacity={0.8}
  >
    {icon && (
      <FontAwesome5
        name={icon}
        size={16}
        color="white"
        style={{ marginRight: 8 }}
      />
    )}
    <Text style={styles.buttonText}>{title}</Text>
  </TouchableOpacity>
);

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
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter-Bold",
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
    fontSize: 15,
    color: COLORS.textDark,
    fontFamily: "Inter-Regular",
    paddingRight: 16,
  },
  eyeBtn: {
    paddingHorizontal: 16,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});
