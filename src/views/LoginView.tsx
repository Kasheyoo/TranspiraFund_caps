import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
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

/** Reusable animated input wrapper with focus border transition */
const FocusInput = ({
  children,
  isFocused,
  style,
}: {
  children: React.ReactNode;
  isFocused: boolean;
  style?: object;
}) => {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
  }, [isFocused, progress]);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [COLORS.border, COLORS.primary],
    ),
    borderWidth: 1.5,
  }));

  return (
    <Animated.View style={[styles.inputBase, style, borderStyle]}>
      {children}
    </Animated.View>
  );
};

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
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const isLocked = lockoutSeconds > 0;

  const handleLogin = useCallback(() => {
    if (!isLoading && !isLocked) onLogin?.();
  }, [isLoading, isLocked, onLogin]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={STYLES.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header — centered with circular logo */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <View style={styles.logoClip}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.title}>TranspiraFund</Text>
          <Text style={styles.subtitle}>Project Engineer Portal</Text>
        </Animated.View>

        {/* Form Card */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(500).springify().damping(20)}
          style={STYLES.card}
        >
          {errorMessage ? (
            <View
              style={[
                styles.errorContainer,
                isLocked && styles.lockoutContainer,
              ]}
            >
              <FontAwesome5
                name={isLocked ? "lock" : "exclamation-circle"}
                size={14}
                color={isLocked ? COLORS.warning : COLORS.error}
              />
              <Text
                style={[
                  styles.errorText,
                  isLocked && { color: COLORS.warning },
                ]}
              >
                {errorMessage}
              </Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <FocusInput isFocused={focusedField === "email"}>
              <TextInput
                style={styles.inputInner}
                value={email}
                onChangeText={setEmail}
                placeholder="name@lgu.gov.ph"
                placeholderTextColor={COLORS.textTertiary}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                editable={!isLocked}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
              />
            </FocusInput>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <FocusInput
              isFocused={focusedField === "password"}
              style={styles.passwordRow}
            >
              <TextInput
                style={[styles.inputInner, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Enter your password"
                placeholderTextColor={COLORS.textTertiary}
                editable={!isLocked}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <FontAwesome5
                  name={showPassword ? "eye-slash" : "eye"}
                  size={18}
                  color={COLORS.textTertiary}
                />
              </TouchableOpacity>
            </FocusInput>
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
            style={[
              STYLES.button,
              (isLoading || isLocked) && { opacity: 0.5 },
            ]}
            onPress={handleLogin}
            disabled={isLoading || isLocked}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.btnText}>
                {isLocked ? `Locked (${lockoutSeconds}s)` : "Sign In"}
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Animated.Text
          entering={FadeIn.delay(300).duration(300)}
          style={styles.footer}
        >
          v1.0.6 — Official Access Only
        </Animated.Text>

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
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoClip: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoImage: {
    width: 112,
    height: 112,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontWeight: "600",
  },
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
  errorText: {
    color: COLORS.error,
    fontWeight: "600",
    marginLeft: 10,
    flex: 1,
    fontSize: 14,
  },
  inputGroup: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  inputBase: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: "hidden",
  },
  inputInner: {
    paddingHorizontal: 16,
    height: 56,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
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
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  checked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkText: { color: COLORS.textSecondary, fontSize: 15 },
  link: { color: COLORS.primary, fontWeight: "700", fontSize: 15 },
  btnText: { color: "white", fontSize: 17, fontWeight: "700" },
  footer: {
    textAlign: "center",
    color: COLORS.textTertiary,
    fontSize: 12,
    marginTop: 24,
    fontWeight: "500",
  },
});
