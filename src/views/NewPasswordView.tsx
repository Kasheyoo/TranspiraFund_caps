import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS, STYLES } from "../constants";
import { validatePassword } from "../utils/security";

interface NewPasswordActions {
  onConfirmNewPassword: (password: string) => void;
}

interface NewPasswordViewProps {
  actions: NewPasswordActions;
  isLoading?: boolean;
}

export const NewPasswordView = ({ actions, isLoading }: NewPasswordViewProps) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const requirements = useMemo(() => validatePassword(newPassword), [newPassword]);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleUpdate = () => {
    if (!requirements.isValid) {
      Alert.alert("Weak Password", "Please meet all password requirements.");
      return;
    }
    if (!passwordsMatch) {
      Alert.alert("Mismatch", "Passwords do not match.");
      return;
    }
    actions.onConfirmNewPassword(newPassword);
  };

  const RequirementRow = ({ met, label }: { met: boolean; label: string }) => (
    <View style={styles.reqRow}>
      <FontAwesome5
        name={met ? "check-circle" : "circle"}
        size={12}
        color={met ? COLORS.success : COLORS.textTertiary}
      />
      <Text style={[styles.reqText, met && { color: COLORS.success }]}>{label}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <FontAwesome5 name="shield-alt" size={30} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>
            Create a strong, secure password for your Engineering Portal account.
          </Text>
        </View>

        <View style={STYLES.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[STYLES.input, { flex: 1, borderWidth: 0 }]}
                secureTextEntry={!showPassword}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor={COLORS.textTertiary}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <FontAwesome5
                  name={showPassword ? "eye-slash" : "eye"}
                  size={16}
                  color={COLORS.textTertiary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={STYLES.input}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter password"
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>

          <View style={styles.reqContainer}>
            <Text style={styles.reqTitle}>PASSWORD REQUIREMENTS</Text>
            <RequirementRow met={requirements.minLength} label="At least 8 characters" />
            <RequirementRow met={requirements.hasUppercase} label="One uppercase letter (A-Z)" />
            <RequirementRow met={requirements.hasLowercase} label="One lowercase letter (a-z)" />
            <RequirementRow met={requirements.hasNumber} label="One number (0-9)" />
            <RequirementRow met={requirements.hasSpecialChar} label="One special character (!@#$...)" />
            {confirmPassword.length > 0 && (
              <RequirementRow met={passwordsMatch} label="Passwords match" />
            )}
          </View>

          <TouchableOpacity
            style={[
              STYLES.button,
              (!requirements.isValid || !passwordsMatch || isLoading) && { opacity: 0.5 },
            ]}
            onPress={handleUpdate}
            disabled={!requirements.isValid || !passwordsMatch || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.btnText}>Set Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: { alignItems: "center", marginBottom: 32 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.textPrimary },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  inputGroup: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
  },
  eyeBtn: { padding: 16 },
  reqContainer: { marginBottom: 20, paddingHorizontal: 4 },
  reqTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.textTertiary,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  reqRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  reqText: {
    fontSize: 12,
    marginLeft: 10,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  btnText: { color: "white", fontSize: 16, fontWeight: "700" },
});
