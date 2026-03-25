import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useEffect, useMemo, useState } from "react";
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
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants";
import { validatePassword } from "../utils/security";

interface NewPasswordActions {
  onConfirmNewPassword: (currentPassword: string, newPassword: string) => void;
}

interface NewPasswordViewProps {
  actions: NewPasswordActions;
  isLoading?: boolean;
  showCurrentPassword?: boolean;
  errorMessage?: string;
}

// ─── Animated focus border wrapper ───────────────────────────────────────────
const FocusInput = ({
  children,
  isFocused,
  hasError,
  isValid,
}: {
  children: React.ReactNode;
  isFocused: boolean;
  hasError?: boolean;
  isValid?: boolean;
}) => {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
  }, [isFocused, progress]);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: hasError
      ? COLORS.error
      : isValid
        ? COLORS.success
        : interpolateColor(progress.value, [0, 1], [COLORS.border, COLORS.primary]),
    borderWidth: 1.5,
  }));

  return (
    <Animated.View style={[styles.inputBase, borderStyle]}>
      {children}
    </Animated.View>
  );
};

// ─── Animated strength bar ───────────────────────────────────────────────────
const StrengthBar = ({ metCount }: { metCount: number }) => {
  const progress = useDerivedValue(() =>
    withTiming(metCount / 5, { duration: 350 }),
  );

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
    backgroundColor: interpolateColor(
      progress.value,
      [0, 0.4, 0.7, 1],
      [COLORS.error, COLORS.error, COLORS.warning, COLORS.success],
    ),
  }));

  const labels = ["", "Weak", "Weak", "Fair", "Good", "Strong"];
  const labelColors = ["", COLORS.error, COLORS.error, COLORS.warning, COLORS.success, COLORS.success];

  return (
    <View style={styles.strengthRow}>
      <View style={styles.strengthTrack}>
        <Animated.View style={[styles.strengthFill, fillStyle]} />
      </View>
      {metCount > 0 && (
        <Text style={[styles.strengthLabel, { color: labelColors[metCount] }]}>
          {labels[metCount]}
        </Text>
      )}
    </View>
  );
};

// ─── Main component ──────────────────────────────────────────────────────────
export const NewPasswordView = ({
  actions,
  isLoading,
  showCurrentPassword = false,
  errorMessage,
}: NewPasswordViewProps) => {
  const insets = useSafeAreaInsets();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const requirements = useMemo(() => validatePassword(newPassword), [newPassword]);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const currentPasswordFilled = !showCurrentPassword || currentPassword.length > 0;
  const metCount = [
    requirements.minLength,
    requirements.hasUppercase,
    requirements.hasLowercase,
    requirements.hasNumber,
    requirements.hasSpecialChar,
  ].filter(Boolean).length;

  const canSubmit = requirements.isValid && passwordsMatch && currentPasswordFilled && !isLoading;

  const handleUpdate = () => {
    if (!canSubmit) return;
    actions.onConfirmNewPassword(currentPassword, newPassword);
  };

  const title = showCurrentPassword ? "Change Password" : "Set New Password";
  const subtitle = showCurrentPassword
    ? "Enter your current password to continue"
    : "Almost done — create a strong password below";

  const ReqItem = ({ met, label }: { met: boolean; label: string }) => (
    <View style={styles.reqItem}>
      <View style={[styles.reqDot, { backgroundColor: met ? COLORS.success : COLORS.border }]}>
        <FontAwesome5 name={met ? "check" : "minus"} size={7} color="#FFFFFF" />
      </View>
      <Text style={[styles.reqText, met && styles.reqTextMet]}>{label}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={{ flex: 1, backgroundColor: COLORS.primary }}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Subtle background orbs */}
      <View style={styles.bgOrbTop} />
      <View style={styles.bgOrbBottom} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.wrapper}>

          {/* ── Header (on teal) ── */}
          <Animated.View entering={FadeIn.delay(80).duration(400)} style={styles.header}>
            <View style={styles.iconCircle}>
              <FontAwesome5 name="lock" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSub}>{subtitle}</Text>
          </Animated.View>

          {/* ── Card ── */}
          <Animated.View entering={FadeInDown.delay(180).duration(440)} style={styles.card}>

            {/* Error banner */}
            {errorMessage ? (
              <Animated.View entering={FadeInDown.duration(280)} style={styles.errorBanner}>
                <FontAwesome5 name="exclamation-circle" size={13} color={COLORS.error} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </Animated.View>
            ) : null}

            {/* Current password (change-password mode only) */}
            {showCurrentPassword && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Current Password</Text>
                <FocusInput
                  isFocused={focused === "current"}
                  isValid={currentPassword.length > 0}
                >
                  <View style={styles.inputRow}>
                    <FontAwesome5
                      name="key"
                      size={14}
                      color={focused === "current" ? COLORS.primary : COLORS.textTertiary}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.inputText}
                      secureTextEntry={!showCurrent}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholder="Enter current password"
                      placeholderTextColor={COLORS.textTertiary}
                      autoCapitalize="none"
                      onFocus={() => setFocused("current")}
                      onBlur={() => setFocused(null)}
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowCurrent(v => !v)}
                      style={styles.eyeBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <FontAwesome5
                        name={showCurrent ? "eye-slash" : "eye"}
                        size={14}
                        color={COLORS.textTertiary}
                      />
                    </TouchableOpacity>
                  </View>
                </FocusInput>
              </View>
            )}

            {/* Divider if current password shown */}
            {showCurrentPassword && (
              <View style={styles.sectionDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerLabel}>NEW PASSWORD</Text>
                <View style={styles.dividerLine} />
              </View>
            )}

            {/* New password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>New Password</Text>
              <FocusInput
                isFocused={focused === "new"}
                hasError={newPassword.length > 2 && !requirements.isValid && focused !== "new"}
                isValid={requirements.isValid}
              >
                <View style={styles.inputRow}>
                  <FontAwesome5
                    name="lock"
                    size={14}
                    color={
                      requirements.isValid
                        ? COLORS.success
                        : focused === "new"
                          ? COLORS.primary
                          : COLORS.textTertiary
                    }
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputText}
                    secureTextEntry={!showNew}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Create a strong password"
                    placeholderTextColor={COLORS.textTertiary}
                    autoCapitalize="none"
                    onFocus={() => setFocused("new")}
                    onBlur={() => setFocused(null)}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowNew(v => !v)}
                    style={styles.eyeBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <FontAwesome5
                      name={showNew ? "eye-slash" : "eye"}
                      size={14}
                      color={COLORS.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
              </FocusInput>

              {/* Strength bar */}
              {newPassword.length > 0 && <StrengthBar metCount={metCount} />}
            </View>

            {/* Confirm password */}
            <View style={styles.fieldGroup}>
              <View style={styles.confirmLabelRow}>
                <Text style={styles.fieldLabel}>Confirm Password</Text>
                {confirmPassword.length > 0 && passwordsMatch && (
                  <Animated.View entering={FadeIn.duration(200)} style={styles.matchBadge}>
                    <FontAwesome5 name="check" size={9} color={COLORS.success} />
                    <Text style={styles.matchBadgeText}>Passwords match</Text>
                  </Animated.View>
                )}
              </View>
              <FocusInput
                isFocused={focused === "confirm"}
                hasError={confirmPassword.length > 0 && !passwordsMatch && focused !== "confirm"}
                isValid={passwordsMatch}
              >
                <View style={styles.inputRow}>
                  <FontAwesome5
                    name={passwordsMatch ? "check-circle" : "lock"}
                    size={14}
                    color={
                      passwordsMatch
                        ? COLORS.success
                        : focused === "confirm"
                          ? COLORS.primary
                          : COLORS.textTertiary
                    }
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputText}
                    secureTextEntry={!showConfirm}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter your password"
                    placeholderTextColor={COLORS.textTertiary}
                    autoCapitalize="none"
                    onFocus={() => setFocused("confirm")}
                    onBlur={() => setFocused(null)}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirm(v => !v)}
                    style={styles.eyeBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <FontAwesome5
                      name={showConfirm ? "eye-slash" : "eye"}
                      size={14}
                      color={COLORS.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
              </FocusInput>
            </View>

            {/* Requirements grid */}
            <View style={styles.reqContainer}>
              <Text style={styles.reqTitle}>Password requirements</Text>
              <View style={styles.reqGrid}>
                <View style={styles.reqCol}>
                  <ReqItem met={requirements.minLength} label="8+ characters" />
                  <ReqItem met={requirements.hasUppercase} label="Uppercase (A-Z)" />
                  <ReqItem met={requirements.hasLowercase} label="Lowercase (a-z)" />
                </View>
                <View style={styles.reqCol}>
                  <ReqItem met={requirements.hasNumber} label="Number (0-9)" />
                  <ReqItem met={requirements.hasSpecialChar} label="Special (!@#...)" />
                  {confirmPassword.length > 0 && (
                    <ReqItem met={passwordsMatch} label="Passwords match" />
                  )}
                </View>
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={handleUpdate}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <FontAwesome5 name="shield-alt" size={14} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>
                    {showCurrentPassword ? "Update Password" : "Set Password"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Security note */}
            <View style={styles.securityNote}>
              <FontAwesome5 name="lock" size={9} color={COLORS.textTertiary} />
              <Text style={styles.securityNoteText}>
                Encrypted end-to-end · Never stored in plain text
              </Text>
            </View>

          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  // ── Background ──
  bgOrbTop: {
    position: "absolute",
    width: 480,
    height: 480,
    borderRadius: 240,
    backgroundColor: "rgba(255,255,255,0.04)",
    top: -160,
    right: -120,
  },
  bgOrbBottom: {
    position: "absolute",
    width: 480,
    height: 480,
    borderRadius: 240,
    backgroundColor: "rgba(0,0,0,0.08)",
    bottom: -180,
    left: -180,
  },

  // ── Layout ──
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  wrapper: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    alignItems: "center",
  },

  // ── Header ──
  header: {
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
  headerSub: {
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },

  // ── Error banner ──
  errorBanner: {
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
  errorBannerText: {
    flex: 1,
    color: COLORS.error,
    fontWeight: "600",
    fontSize: 13,
  },

  // ── Section divider ──
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.textTertiary,
    letterSpacing: 1.2,
  },

  // ── Fields ──
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  confirmLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  matchBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.successSoft,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.success,
  },

  // ── Input ──
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
    width: 16,
    textAlign: "center",
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  eyeBtn: {
    padding: 8,
    marginLeft: 4,
  },

  // ── Strength bar ──
  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 10,
  },
  strengthTrack: {
    flex: 1,
    height: 5,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  strengthFill: {
    height: 5,
    borderRadius: 3,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: "700",
    minWidth: 36,
    textAlign: "right",
  },

  // ── Requirements ──
  reqContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reqTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textTertiary,
    letterSpacing: 0.4,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  reqGrid: {
    flexDirection: "row",
    gap: 8,
  },
  reqCol: {
    flex: 1,
    gap: 6,
  },
  reqItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reqDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  reqText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontWeight: "500",
    flex: 1,
  },
  reqTextMet: {
    color: COLORS.success,
    fontWeight: "600",
  },

  // ── Submit button ──
  submitBtn: {
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
    marginBottom: 16,
  },
  submitBtnDisabled: {
    opacity: 0.4,
    elevation: 0,
    shadowOpacity: 0,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  // ── Security note ──
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  securityNoteText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: "500",
    textAlign: "center",
  },
});
