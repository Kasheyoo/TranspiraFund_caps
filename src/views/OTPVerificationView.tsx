import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
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
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { COLORS, STYLES } from "../constants";

interface OTPVerificationViewProps {
  email: string;
  isLoading: boolean;
  errorMessage: string;
  resendSeconds: number;
  isSending: boolean;
  onSubmit: (code: string) => void;
  onResend: () => void;
  onBack: () => void;
}

const CELL_COUNT = 6;

/** Animated OTP cell with pop effect on digit entry */
const OTPCell = ({
  digit,
  index,
  hasError,
  inputRef,
  onChangeText,
  onKeyPress,
  isLoading,
}: {
  digit: string;
  index: number;
  hasError: boolean;
  inputRef: (ref: TextInput | null) => void;
  onChangeText: (text: string) => void;
  onKeyPress: (key: string) => void;
  isLoading: boolean;
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleChange = (text: string) => {
    if (text.length >= 1) {
      scale.value = withSpring(1.08, { damping: 12, stiffness: 400 });
      setTimeout(() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }, 80);
    }
    onChangeText(text);
  };

  return (
    <Animated.View
      entering={FadeIn.delay(200 + index * 60).duration(300)}
      style={animatedStyle}
    >
      <TextInput
        ref={inputRef}
        style={[
          styles.otpCell,
          digit ? styles.otpCellFilled : null,
          hasError ? styles.otpCellError : null,
        ]}
        value={digit}
        onChangeText={handleChange}
        onKeyPress={({ nativeEvent }) => onKeyPress(nativeEvent.key)}
        keyboardType="numeric"
        maxLength={6}
        selectTextOnFocus
        autoFocus={index === 0}
        editable={!isLoading}
      />
    </Animated.View>
  );
};

export const OTPVerificationView = ({
  email,
  isLoading,
  errorMessage,
  resendSeconds,
  isSending,
  onSubmit,
  onResend,
  onBack,
}: OTPVerificationViewProps) => {
  const insets = useSafeAreaInsets();
  const [otp, setOtp] = useState<string[]>(Array(CELL_COUNT).fill(""));
  const inputRefs = useRef<(TextInput | null)[]>(Array(CELL_COUNT).fill(null));

  const handleChange = (text: string, index: number) => {
    // Handle paste — fill all cells
    if (text.length > 1) {
      const digits = text.replace(/\D/g, "").split("").slice(0, CELL_COUNT);
      const next = [...Array(CELL_COUNT).fill("")];
      digits.forEach((d, i) => {
        next[i] = d;
      });
      setOtp(next);
      const lastFilled = Math.min(digits.length, CELL_COUNT - 1);
      inputRefs.current[lastFilled]?.focus();
      return;
    }
    const digit = text.replace(/\D/g, "");
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < CELL_COUNT - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      const next = [...otp];
      next[index - 1] = "";
      setOtp(next);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = () => {
    const code = otp.join("");
    if (code.length === CELL_COUNT) onSubmit(code);
  };

  const resetOtp = () => {
    setOtp(Array(CELL_COUNT).fill(""));
    inputRefs.current[0]?.focus();
  };

  const isComplete = otp.every((d) => d !== "");
  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) =>
    a + b.replace(/./g, "*") + c,
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      {/* Back button */}
      <Animated.View entering={FadeIn.duration(300)}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <FontAwesome5
            name="arrow-left"
            size={16}
            color={COLORS.textSecondary}
          />
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.content}>
        {/* Header — inline icon with title, left-aligned */}
        <Animated.View
          entering={FadeIn.delay(100).duration(400)}
          style={styles.headerRow}
        >
          <FontAwesome5
            name="envelope-open-text"
            size={20}
            color={COLORS.primary}
          />
          <Text style={styles.title}>Check your email</Text>
        </Animated.View>

        <Animated.Text
          entering={FadeIn.delay(150).duration(400)}
          style={styles.subtitle}
        >
          We sent a 6-digit verification code to
        </Animated.Text>
        <Animated.Text
          entering={FadeIn.delay(180).duration(400)}
          style={styles.emailText}
        >
          {maskedEmail}
        </Animated.Text>

        {/* OTP cells */}
        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <OTPCell
              key={index}
              digit={digit}
              index={index}
              hasError={!!errorMessage}
              inputRef={(ref) => {
                inputRefs.current[index] = ref;
              }}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(key) => handleKeyPress(key, index)}
              isLoading={isLoading}
            />
          ))}
        </View>

        {/* Error */}
        {errorMessage ? (
          <Animated.View entering={FadeInDown.duration(300)}>
            <TouchableOpacity style={styles.errorBox} onPress={resetOtp}>
              <FontAwesome5
                name="exclamation-circle"
                size={13}
                color={COLORS.error}
              />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : null}

        {/* Verify button */}
        <Animated.View
          entering={FadeIn.delay(500).duration(300)}
          style={{ width: "100%" }}
        >
          <TouchableOpacity
            style={[
              STYLES.button,
              (!isComplete || isLoading) && { opacity: 0.5 },
            ]}
            onPress={handleSubmit}
            disabled={!isComplete || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.btnText}>Verify Code</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Resend */}
        <View style={styles.resendRow}>
          {isSending ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : resendSeconds > 0 ? (
            <Text style={styles.resendTimer}>
              Resend code in{" "}
              <Text style={{ fontWeight: "800" }}>{resendSeconds}s</Text>
            </Text>
          ) : (
            <TouchableOpacity onPress={onResend} style={styles.resendBtn}>
              <FontAwesome5 name="redo" size={12} color={COLORS.primary} />
              <Text style={styles.resendLink}>Resend Code</Text>
            </TouchableOpacity>
          )}
        </View>

        <Animated.Text
          entering={FadeIn.delay(600).duration(300)}
          style={styles.hint}
        >
          Code expires in 5 minutes. Check your spam folder if not received.
        </Animated.Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  backText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingBottom: 60,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  emailText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 4,
    marginBottom: 32,
  },
  otpRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
    alignSelf: "center",
  },
  otpCell: {
    width: 50,
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  otpCellFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  otpCellError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorSoft,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.errorSoft,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
    width: "100%",
  },
  errorText: {
    color: COLORS.error,
    fontWeight: "600",
    fontSize: 13,
    flex: 1,
  },
  btnText: { color: "white", fontSize: 16, fontWeight: "700" },
  resendRow: {
    marginTop: 20,
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    alignSelf: "center",
  },
  resendTimer: { fontSize: 13, color: COLORS.textSecondary },
  resendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
  },
  resendLink: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
  hint: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: "center",
    marginTop: 24,
    lineHeight: 18,
    paddingHorizontal: 16,
    alignSelf: "center",
  },
});
