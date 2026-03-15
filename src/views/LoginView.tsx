import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useState } from "react";
import {
  ActivityIndicator,
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
import { ForgotPasswordModal } from "./ForgotPasswordView";

interface LoginData {
  email: string;
  password: string;
  rememberMe: boolean;
  isLoading: boolean;
  errorMessage: string;
  isResetModalVisible: boolean;
  lockoutSeconds?: number;
}

interface LoginActions {
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setRememberMe: (value: boolean) => void;
  onLogin: () => void;
  onForgotPassword: (email: string) => void;
  setIsResetModalVisible: (visible: boolean) => void;
}

interface LoginViewProps {
  data: LoginData;
  actions: LoginActions;
}

export const LoginView = ({ data, actions }: LoginViewProps) => {
  const {
    email,
    password,
    rememberMe,
    isLoading,
    errorMessage,
    isResetModalVisible,
    lockoutSeconds = 0,
  } = data || {};

  const {
    setEmail,
    setPassword,
    setRememberMe,
    onLogin,
    onForgotPassword,
    setIsResetModalVisible,
  } = actions || {};

  const [showPassword, setShowPassword] = useState(false);
  const isLocked = lockoutSeconds > 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={STYLES.container}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <FontAwesome5 name="layer-group" size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>TranspiraFund</Text>
          <Text style={styles.subtitle}>Engineering Portal</Text>
        </View>

        <View style={STYLES.card}>
          {errorMessage ? (
            <View style={[styles.errorContainer, isLocked && styles.lockoutContainer]}>
              <FontAwesome5
                name={isLocked ? "lock" : "exclamation-circle"}
                size={14}
                color={isLocked ? COLORS.warning : COLORS.error}
              />
              <Text style={[styles.errorText, isLocked && { color: COLORS.warning }]}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={STYLES.input}
              value={email}
              onChangeText={setEmail}
              placeholder="name@lgu.gov.ph"
              placeholderTextColor={COLORS.textTertiary}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              editable={!isLocked}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Enter your password"
                placeholderTextColor={COLORS.textTertiary}
                editable={!isLocked}
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

          <View style={styles.row}>
            <TouchableOpacity
              onPress={() => setRememberMe && setRememberMe(!rememberMe)}
              style={styles.checkRow}
            >
              <View style={[styles.checkbox, rememberMe && styles.checked]}>
                {rememberMe && (
                  <FontAwesome5 name="check" size={10} color="white" />
                )}
              </View>
              <Text style={styles.checkText}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsResetModalVisible?.(true)}>
              <Text style={styles.link}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[STYLES.button, (isLoading || isLocked) && { opacity: 0.5 }]}
            onPress={onLogin}
            disabled={isLoading || isLocked}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.btnText}>
                {isLocked ? `Locked (${lockoutSeconds}s)` : "Sign In"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>v1.0.6 — Official Access Only</Text>

        <ForgotPasswordModal
          visible={isResetModalVisible}
          onClose={() => setIsResetModalVisible?.(false)}
          onSend={(resetEmail) => onForgotPassword?.(resetEmail)}
          isLoading={isLoading}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  header: { alignItems: "center", marginBottom: 32 },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.textPrimary },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4, fontWeight: "600" },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.errorSoft,
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  lockoutContainer: {
    backgroundColor: COLORS.warningSoft,
  },
  errorText: { color: COLORS.error, fontWeight: "600", marginLeft: 10, flex: 1, fontSize: 13 },
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
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    height: 56,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  eyeBtn: {
    padding: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  checkRow: { flexDirection: "row", alignItems: "center" },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  checked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkText: { color: COLORS.textSecondary, fontSize: 14 },
  link: { color: COLORS.primary, fontWeight: "700", fontSize: 14 },
  btnText: { color: "white", fontSize: 16, fontWeight: "700" },
  footer: {
    textAlign: "center",
    color: COLORS.textTertiary,
    fontSize: 12,
    marginTop: 24,
    fontWeight: "500",
  },
});
