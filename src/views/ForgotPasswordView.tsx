import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { isValidEmail, sanitizeInput } from "../utils/security";

interface ForgotPasswordViewProps {
  onBack: () => void;
  onSend: (email: string) => void;
  isLoading?: boolean;
  isSent?: boolean;
}

/** Animated focus border — same pattern as LoginView */
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

export const ForgotPasswordView = ({
  onBack,
  onSend,
  isLoading,
  isSent = false,
}: ForgotPasswordViewProps) => {
  const insets = useSafeAreaInsets();
  const [resetEmail, setResetEmail] = useState("");
  const [error, setError] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSend = () => {
    setError("");
    const cleaned = sanitizeInput(resetEmail, 254);
    if (!cleaned) {
      setError("Please enter your email address.");
      return;
    }
    if (!isValidEmail(cleaned)) {
      setError("Please enter a valid email address.");
      return;
    }
    onSend(cleaned);
  };

  // ── Success state ──
  if (isSent) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.primary }}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.bgAccentTop} />
        <View style={styles.bgAccentBottom} />

        <View style={[styles.scrollContent, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32, justifyContent: "center" }]}>
          <View style={styles.centerWrapper}>

            {/* Success header on teal */}
            <Animated.View entering={FadeIn.duration(400)} style={styles.headerArea}>
              <View style={[styles.iconCircle, { backgroundColor: "rgba(16,185,129,0.2)", borderColor: "rgba(16,185,129,0.4)" }]}>
                <FontAwesome5 name="check-circle" size={32} color="#10B981" />
              </View>
              <Text style={styles.headerTitle}>Password Reset!</Text>
              <Text style={styles.headerSubtitle}>
                Your password has been successfully updated.
              </Text>
            </Animated.View>

            {/* Info card */}
            <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>You're all set</Text>
                <Text style={styles.cardSubtitle}>
                  Sign in with your new credentials
                </Text>
              </View>

              <TouchableOpacity
                style={styles.backToLoginBtn}
                onPress={onBack}
                activeOpacity={0.85}
              >
                <FontAwesome5 name="arrow-left" size={14} color="#FFFFFF" />
                <Text style={styles.backToLoginBtnText}>Back to Sign In</Text>
              </TouchableOpacity>
            </Animated.View>

          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={{ flex: 1, backgroundColor: COLORS.primary }}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Background accents */}
      <View style={styles.bgAccentTop} />
      <View style={styles.bgAccentBottom} />

      {/* Back button */}
      <Animated.View
        entering={FadeIn.duration(300)}
        style={[styles.navBar, { marginTop: insets.top }]}
      >
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <FontAwesome5 name="arrow-left" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.centerWrapper}>

          {/* ── Header area (on teal) ── */}
          <Animated.View
            entering={FadeIn.delay(100).duration(400)}
            style={styles.headerArea}
          >
            <View style={styles.iconCircle}>
              <FontAwesome5 name="envelope-open-text" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.headerTitle}>Forgot Password?</Text>
            <Text style={styles.headerSubtitle}>
              No worries — we'll send a 6-digit code{"\n"}to your registered email
            </Text>
          </Animated.View>

          {/* ── Card ── */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(450)}
            style={styles.card}
          >
            {/* Card header */}
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Enter your email</Text>
              <Text style={styles.cardSubtitle}>
                Use the address linked to your account
              </Text>
            </View>

            {/* Error banner */}
            {error ? (
              <View style={styles.alertBanner}>
                <FontAwesome5
                  name="exclamation-circle"
                  size={13}
                  color={COLORS.error}
                />
                <Text style={styles.alertText}>{error}</Text>
              </View>
            ) : null}

            {/* Email input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email address</Text>
              <FocusInput isFocused={isFocused} hasError={!!error}>
                <View style={styles.inputRow}>
                  <FontAwesome5
                    name="envelope"
                    size={15}
                    color={isFocused ? COLORS.primary : COLORS.textTertiary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputInner}
                    placeholder="name@lgu.gov.ph"
                    placeholderTextColor={COLORS.textTertiary}
                    value={resetEmail}
                    onChangeText={(t) => {
                      setResetEmail(t);
                      if (error) setError("");
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                  />
                </View>
              </FocusInput>
            </View>

            {/* Send button */}
            <TouchableOpacity
              style={[styles.sendBtn, isLoading && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.sendBtnText}>Send Code</Text>
                  <FontAwesome5
                    name="paper-plane"
                    size={14}
                    color="#FFFFFF"
                    style={styles.btnIcon}
                  />
                </>
              )}
            </TouchableOpacity>

            {/* Info note */}
            <View style={styles.infoNote}>
              <FontAwesome5 name="clock" size={10} color={COLORS.textTertiary} />
              <Text style={styles.infoText}>
                Code expires in 10 minutes · Check your spam folder
              </Text>
            </View>
          </Animated.View>

          {/* Back to login */}
          <Animated.View
            entering={FadeIn.delay(400).duration(400)}
            style={styles.backToLogin}
          >
            <Text style={styles.backToLoginText}>Remember your password? </Text>
            <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
              <Text style={styles.backToLoginLink}>Sign in</Text>
            </TouchableOpacity>
          </Animated.View>

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

  // ── Nav ──
  navBar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Scroll ──
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

  // ── Header area (on teal) ──
  headerArea: {
    alignItems: "center",
    marginBottom: 28,
    width: "100%",
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.2,
    textAlign: "center",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 21,
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
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 4,
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
    textAlign: "center",
  },

  // ── Alert ──
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.errorSoft,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    gap: 10,
  },
  alertText: {
    flex: 1,
    color: COLORS.error,
    fontWeight: "600",
    fontSize: 13,
  },

  // ── Input ──
  inputGroup: {
    marginBottom: 20,
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

  // ── Send button ──
  sendBtn: {
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
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  btnIcon: {
    marginTop: 1,
  },

  // ── Info note ──
  infoNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  infoText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 0.1,
  },

  // ── Back to login ──
  backToLogin: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  backToLoginText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    fontWeight: "500",
  },
  backToLoginLink: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "800",
  },

  // ── Success state ──
  emailChipSuccess: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginTop: 12,
    gap: 8,
  },
  emailChipText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.95)",
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepNum: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "500",
    lineHeight: 20,
  },
  expireNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
    marginBottom: 20,
  },
  expireText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 0.1,
    flex: 1,
  },
  backToLoginBtn: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    gap: 10,
  },
  backToLoginBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
