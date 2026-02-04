import { FontAwesome5 } from "@expo/vector-icons";
import { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { COLORS, STYLES } from "../constants";

export const NewPasswordView = ({ actions, isLoading }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleUpdate = () => {
    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    // ✅ Trigger the custom Firebase reset logic
    actions.onConfirmNewPassword(newPassword);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <FontAwesome5 name="shield-alt" size={30} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Secure Reset</Text>
        <Text style={styles.subtitle}>
          Set a strong password for your Engineering Portal account.
        </Text>
      </View>

      <View style={STYLES.card}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={STYLES.input}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="••••••••"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm New Password</Text>
          <TextInput
            style={STYLES.input}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
          />
        </View>

        <TouchableOpacity
          style={[STYLES.button, isLoading && { opacity: 0.7 }]}
          onPress={handleUpdate}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.btnText}>Update Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};
