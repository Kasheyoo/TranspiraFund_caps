import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants";

interface LoginData {
  email: string;
  password: string;
  rememberMe: boolean;
  isLoading: boolean;
  errorMessage: string;
  lockoutSeconds?: number;
}

interface LoginActions {
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setRememberMe: (value: boolean) => void;
  onLogin: () => void;
  onNavigateToForgotPassword?: () => void;
}

interface LoginViewProps {
  data: LoginData;
  actions: LoginActions;
}

const FocusInput = ({
  children,
  isFocused,
  hasError,
}: {
  children: React.ReactNode;
  isFocused: boolean;
  hasError?: boolean;
}) => {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
  }, [isFocused, progress]);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: hasError
      ? COLORS.error
      : interpolateColor(progress.value, [0, 1], [COLORS.border, COLORS.primary]),
    borderWidth: 1.5,
  }));

  return (
    <Animated.View style={[styles.inputBase, borderStyle]}>
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
    lockoutSeconds = 0,
  } = data || {};

  const {
    setEmail,
    setPassword,
    setRememberMe,
    onLogin,
    onNavigateToForgotPassword,
  } = actions || {};

  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const isLocked = lockoutSeconds > 0;
  const insets = useSafeAreaInsets();

  const handleLogin = useCallback(() => {
    if (!isLoading && !isLocked) onLogin?.();
  }, [isLoading, isLocked, onLogin]);

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={{ flex: 1, backgroundColor: COLORS.primary }}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Background accents */}
      <View style={styles.bgAccentTop} />
      <View style={styles.bgAccentBottom} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.centerWrapper}>

          {/* ── Masthead ── */}
          <Animated.View entering={FadeIn.duration(500)} style={styles.masthead}>
            <View style={styles.logoContainer}>
              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.mastheadTitle}>TranspiraFund</Text>
            <Text style={styles.mastheadSubtitle}>Project Engineer Portal</Text>
          </Animated.View>

          {/* ── Form card ── */}
          <Animated.View
            entering={FadeInDown.delay(150).duration(500)}
            style={styles.card}
          >
            {/* Card header */}
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Welcome back</Text>
              <Text style={styles.cardSubtitle}>Sign in to access your dashboard</Text>
            </View>

            {/* Error / lockout banner */}
            {errorMessage ? (
              <View style={[styles.alertBanner, isLocked && styles.lockoutBanner]}>
                <FontAwesome5
                  name={isLocked ? "lock" : "exclamation-circle"}
                  size={13}
                  color={isLocked ? COLORS.warning : COLORS.error}
                />
                <Text style={[styles.alertText, isLocked && styles.lockoutText]}>
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email address</Text>
              <FocusInput
                isFocused={focusedField === "email"}
                hasError={!!errorMessage}
              >
                <View style={styles.inputRow}>
                  <FontAwesome5
                    name="envelope"
                    size={15}
                    color={focusedField === "email" ? COLORS.primary : COLORS.textTertiary}
                    style={styles.inputIcon}
                  />
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
                </View>
              </FocusInput>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <FocusInput
                isFocused={focusedField === "password"}
                hasError={!!errorMessage}
              >
                <View style={styles.inputRow}>
                  <FontAwesome5
                    name="lock"
                    size={15}
                    color={focusedField === "password" ? COLORS.primary : COLORS.textTertiary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputInner}
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
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <FontAwesome5
                      name={showPassword ? "eye-slash" : "eye"}
                      size={16}
                      color={COLORS.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
              </FocusInput>
            </View>

            {/* Remember me + Forgot password */}
            <View style={styles.utilityRow}>
              <TouchableOpacity
                onPress={() => setRememberMe?.(!rememberMe)}
                style={styles.checkRow}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe && (
                    <FontAwesome5 name="check" size={9} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.checkLabel}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onNavigateToForgotPassword}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Sign In button */}
            <TouchableOpacity
              style={[styles.signInBtn, (isLoading || isLocked) && styles.signInBtnDisabled]}
              onPress={handleLogin}
              disabled={isLoading || isLocked}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.signInBtnText}>
                    {isLocked ? `Try again in ${lockoutSeconds}s` : "Sign In"}
                  </Text>
                  {!isLocked && (
                    <FontAwesome5
                      name="arrow-right"
                      size={15}
                      color="#FFFFFF"
                      style={styles.btnIcon}
                    />
                  )}
                </>
              )}
            </TouchableOpacity>

            {/* Security note */}
            <View style={styles.securityNote}>
              <FontAwesome5 name="shield-alt" size={10} color={COLORS.textTertiary} />
              <Text style={styles.securityText}>
                End-to-end encrypted · Official access only
              </Text>
            </View>
          </Animated.View>

          {/* Footer */}
          <Animated.Text
            entering={FadeIn.delay(350).duration(400)}
            style={styles.footer}
          >
            v1.0.0 · Construction Services Division, DEPW
          </Animated.Text>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  bgAccentTop: {
    position: "absolute",
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: "rgba(255,255,255,0.04)",
    top: -160,
    right: -120,
  },
  bgAccentBottom: {
    position: "absolute",
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: "rgba(0,0,0,0.08)",
    bottom: -180,
    left: -180,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  centerWrapper: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    alignItems: "center",
  },

  // ── Masthead ──
  masthead: {
    alignItems: "center",
    marginBottom: 28,
    width: "100%",
  },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: "hidden",
    marginBottom: 16,
  },
  logoImage: {
    width: 88,
    height: 88,
  },
  mastheadTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  mastheadSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
    letterSpacing: 0.4,
  },

  // ── Card ──
  card: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  cardHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 6,
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
    textAlign: "center",
  },

  // ── Alert banner ──
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.errorSoft,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
    gap: 10,
  },
  lockoutBanner: {
    backgroundColor: COLORS.warningSoft,
  },
  alertText: {
    flex: 1,
    color: COLORS.error,
    fontWeight: "600",
    fontSize: 13,
  },
  lockoutText: {
    color: COLORS.warning,
  },

  // ── Inputs ──
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputBase: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    overflow: "hidden",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 54,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
    width: 18,
    textAlign: "center",
  },
  inputInner: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  eyeBtn: {
    padding: 4,
    marginLeft: 8,
  },

  // ── Utility row ──
  utilityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 24,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  forgotLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "700",
  },

  // ── Sign In button ──
  signInBtn: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 20,
    gap: 10,
  },
  signInBtnDisabled: {
    opacity: 0.6,
  },
  signInBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  btnIcon: {
    marginTop: 1,
  },

  // ── Security note ──
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  securityText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: "500",
    letterSpacing: 0.2,
  },

  // ── Footer ──
  footer: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "600",
    letterSpacing: 0.5,
    textAlign: "center",
  },
});
