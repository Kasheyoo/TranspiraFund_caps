import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useRef, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { COLORS } from "../constants";

interface ForgotPasswordOTPViewProps {
  email: string;
  isLoading: boolean;
  isSending: boolean;
  errorMessage: string;
  resendSeconds: number;
  onSubmit: (code: string) => void;
  onResend: () => void;
  onBack: () => void;
}

const CELL_COUNT = 6;

/** OTPCell — outer Animated.View handles entering, inner handles scale transform */
const OTPCell = ({
  digit,
  index,
  hasError,
  isFocused,
  inputRef,
  onChangeText,
  onKeyPress,
  onFocus,
  isLoading,
}: {
  digit: string;
  index: number;
  hasError: boolean;
  isFocused: boolean;
  inputRef: (ref: TextInput | null) => void;
  onChangeText: (text: string) => void;
  onKeyPress: (key: string) => void;
  onFocus: () => void;
  isLoading: boolean;
}) => {
  const scale = useSharedValue(1);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleChange = (text: string) => {
    if (text.length >= 1) {
      scale.value = withTiming(1.06, { duration: 80 });
      setTimeout(() => {
        scale.value = withTiming(1, { duration: 120 });
      }, 100);
    }
    onChangeText(text);
  };

  return (
    <Animated.View entering={FadeInUp.delay(300 + index * 60).duration(350)}>
      <Animated.View style={scaleStyle}>
        <TextInput
          ref={inputRef}
          style={[
            styles.otpCell,
            digit ? styles.otpCellFilled : null,
            isFocused && !hasError ? styles.otpCellFocused : null,
            hasError ? styles.otpCellError : null,
          ]}
          value={digit}
          onChangeText={handleChange}
          onKeyPress={({ nativeEvent }) => onKeyPress(nativeEvent.key)}
          onFocus={onFocus}
          keyboardType="numeric"
          maxLength={6}
          selectTextOnFocus
          autoFocus={index === 0}
          editable={!isLoading}
        />
        {isFocused && !digit && !hasError && <View style={styles.cursor} />}
      </Animated.View>
    </Animated.View>
  );
};

export const ForgotPasswordOTPView = ({
  email,
  isLoading,
  isSending,
  errorMessage,
  resendSeconds,
  onSubmit,
  onResend,
  onBack,
}: ForgotPasswordOTPViewProps) => {
  const insets = useSafeAreaInsets();
  const [otp, setOtp] = useState<string[]>(Array(CELL_COUNT).fill(""));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>(Array(CELL_COUNT).fill(null));

  const handleChange = (text: string, index: number) => {
    if (text.length > 1) {
      const digits = text.replace(/\D/g, "").split("").slice(0, CELL_COUNT);
      const next = [...Array(CELL_COUNT).fill("")];
      digits.forEach((d, i) => { next[i] = d; });
      setOtp(next);
      const lastFilled = Math.min(digits.length, CELL_COUNT - 1);
      inputRefs.current[lastFilled]?.focus();
      setFocusedIndex(lastFilled);
      return;
    }
    const digit = text.replace(/\D/g, "");
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < CELL_COUNT - 1) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      const next = [...otp];
      next[index - 1] = "";
      setOtp(next);
      inputRefs.current[index - 1]?.focus();
      setFocusedIndex(index - 1);
    }
  };

  const handleSubmit = () => {
    const code = otp.join("");
    if (code.length === CELL_COUNT) onSubmit(code);
  };

  const resetOtp = () => {
    setOtp(Array(CELL_COUNT).fill(""));
    setFocusedIndex(0);
    inputRefs.current[0]?.focus();
  };

  const isComplete = otp.every((d) => d !== "");
  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) =>
    a + b.replace(/./g, "*") + c,
  );

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
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.centerWrapper}>

          {/* ── Header area (on teal) ── */}
          <Animated.View
            entering={FadeIn.delay(100).duration(400)}
            style={styles.headerArea}
          >
            <View style={styles.iconCircle}>
              <FontAwesome5 name="key" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.headerTitle}>Check Your Email</Text>
            <Text style={styles.headerSubtitle}>
              We sent a 6-digit reset code to
            </Text>
            <View style={styles.emailChip}>
              <FontAwesome5 name="envelope" size={11} color="rgba(255,255,255,0.9)" />
              <Text style={styles.emailText}>{maskedEmail}</Text>
            </View>
          </Animated.View>

          {/* ── Card ── */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(450)}
            style={styles.card}
          >
            {/* Card header */}
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Enter your code</Text>
              <Text style={styles.cardSubtitle}>
                Type the 6-digit code from your email
              </Text>
            </View>

            {/* OTP cells */}
            <View style={styles.otpRow}>
              {otp.map((digit, index) => (
                <OTPCell
                  key={index}
                  digit={digit}
                  index={index}
                  hasError={!!errorMessage}
                  isFocused={focusedIndex === index}
                  inputRef={(ref) => { inputRefs.current[index] = ref; }}
                  onChangeText={(text) => handleChange(text, index)}
                  onKeyPress={(key) => handleKeyPress(key, index)}
                  onFocus={() => setFocusedIndex(index)}
                  isLoading={isLoading}
                />
              ))}
            </View>

            {/* Error banner */}
            {errorMessage ? (
              <Animated.View entering={FadeInDown.duration(300)}>
                <TouchableOpacity style={styles.alertBanner} onPress={resetOtp} activeOpacity={0.8}>
                  <FontAwesome5 name="exclamation-circle" size={13} color={COLORS.error} />
                  <Text style={styles.alertText}>{errorMessage} · Tap to clear</Text>
                </TouchableOpacity>
              </Animated.View>
            ) : null}

            {/* Verify button */}
            <TouchableOpacity
              style={[
                styles.verifyBtn,
                (!isComplete || isLoading) && styles.verifyBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!isComplete || isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.verifyBtnText}>Verify Code</Text>
                  <FontAwesome5 name="arrow-right" size={14} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Resend */}
            <View style={styles.resendRow}>
              {isSending ? (
                <View style={styles.sendingRow}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.sendingText}>Sending new code...</Text>
                </View>
              ) : resendSeconds > 0 ? (
                <Text style={styles.resendTimer}>
                  Resend available in{" "}
                  <Text style={styles.resendTimerBold}>{resendSeconds}s</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={onResend} style={styles.resendBtn} activeOpacity={0.7}>
                  <FontAwesome5 name="redo" size={12} color={COLORS.primary} />
                  <Text style={styles.resendLink}>Resend Code</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Hint */}
            <View style={styles.hintNote}>
              <FontAwesome5 name="clock" size={10} color={COLORS.textTertiary} />
              <Text style={styles.hintText}>
                Code expires in 10 minutes · Check your spam folder
              </Text>
            </View>
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

  // ── Header (on teal) ──
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
    marginBottom: 12,
  },
  emailChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  emailText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },

  // ── Card ──
  card: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
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

  // ── OTP cells ──
  otpRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
  },
  otpCell: {
    width: 46,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: "#F8FAFC",
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textPrimary,
    elevation: 1,
  },
  otpCellFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
    elevation: 3,
  },
  otpCellFocused: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.surface,
    elevation: 3,
  },
  otpCellError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorSoft,
  },
  cursor: {
    position: "absolute",
    bottom: 12,
    left: "50%",
    marginLeft: -8,
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.accent,
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
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.15)",
  },
  alertText: {
    flex: 1,
    color: COLORS.error,
    fontWeight: "600",
    fontSize: 13,
  },

  // ── Verify button ──
  verifyBtn: {
    backgroundColor: COLORS.primary,
    height: 54,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 20,
  },
  verifyBtnDisabled: {
    opacity: 0.45,
    elevation: 0,
  },
  verifyBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  // ── Divider ──
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // ── Resend ──
  resendRow: {
    alignItems: "center",
    minHeight: 40,
    justifyContent: "center",
    marginBottom: 20,
  },
  sendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sendingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  resendTimer: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  resendTimerBold: {
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  resendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: "rgba(15,118,110,0.15)",
  },
  resendLink: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },

  // ── Hint ──
  hintNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  hintText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 0.1,
  },
});
