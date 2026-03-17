import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import { COLORS, STYLES } from "../constants";
import { validatePassword } from "../utils/security";

interface NewPasswordActions {
  onConfirmNewPassword: (currentPassword: string, newPassword: string) => void;
}

interface NewPasswordViewProps {
  actions: NewPasswordActions;
  isLoading?: boolean;
  /** Show "Current Password" field for re-authentication */
  showCurrentPassword?: boolean;
  errorMessage?: string;
}

/** Animated strength bar that fills and changes color based on requirements met */
const StrengthBar = ({ metCount }: { metCount: number }) => {
  const progress = useDerivedValue(() =>
    withTiming(metCount / 5, { duration: 300 }),
  );

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
    backgroundColor: interpolateColor(
      progress.value,
      [0, 0.4, 0.7, 1],
      [COLORS.error, COLORS.error, COLORS.warning, COLORS.success],
    ),
  }));

  const labels = ["", "Weak", "Weak", "Fair", "Good", "Strong"];
  const labelColor =
    metCount <= 2
      ? COLORS.error
      : metCount <= 3
        ? COLORS.warning
        : COLORS.success;

  return (
    <View style={styles.strengthContainer}>
      <View style={styles.strengthTrack}>
        <Animated.View style={[styles.strengthFill, barStyle]} />
      </View>
      {metCount > 0 && (
        <Text style={[styles.strengthLabel, { color: labelColor }]}>
          {labels[metCount]}
        </Text>
      )}
    </View>
  );
};

export const NewPasswordView = ({
  actions,
  isLoading,
  showCurrentPassword = false,
  errorMessage,
}: NewPasswordViewProps) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const requirements = useMemo(
    () => validatePassword(newPassword),
    [newPassword],
  );
  const passwordsMatch =
    newPassword.length > 0 && newPassword === confirmPassword;
  const currentPasswordFilled =
    !showCurrentPassword || currentPassword.length > 0;

  const metCount = [
    requirements.minLength,
    requirements.hasUppercase,
    requirements.hasLowercase,
    requirements.hasNumber,
    requirements.hasSpecialChar,
  ].filter(Boolean).length;

  const handleUpdate = () => {
    if (showCurrentPassword && !currentPassword) {
      Alert.alert("Required", "Please enter your current password.");
      return;
    }
    if (!requirements.isValid) {
      Alert.alert("Weak Password", "Please meet all password requirements.");
      return;
    }
    if (!passwordsMatch) {
      Alert.alert("Mismatch", "Passwords do not match.");
      return;
    }
    actions.onConfirmNewPassword(currentPassword, newPassword);
  };

  const RequirementRow = ({ met, label }: { met: boolean; label: string }) => (
    <View style={styles.reqRow}>
      <FontAwesome5
        name={met ? "check-circle" : "circle"}
        size={12}
        color={met ? COLORS.success : COLORS.textTertiary}
      />
      <Text style={[styles.reqText, met && { color: COLORS.success }]}>
        {label}
      </Text>
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
        {/* Header — centered circular logo */}
        <Animated.View
          entering={FadeIn.duration(400)}
          style={styles.header}
        >
          <View style={styles.logoClip}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>
            Create a strong password for your account.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(150).duration(500).springify().damping(20)}
          style={STYLES.card}
        >
          {showCurrentPassword && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Password</Text>
              <TextInput
                style={STYLES.input}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
          )}

          {errorMessage ? (
            <Animated.View entering={FadeInDown.duration(250)}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </Animated.View>
          ) : null}

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
            <View style={styles.confirmLabelRow}>
              <Text style={styles.label}>Confirm Password</Text>
              {confirmPassword.length > 0 && passwordsMatch && (
                <Animated.View entering={FadeIn.duration(200)}>
                  <FontAwesome5
                    name="check-circle"
                    size={14}
                    color={COLORS.success}
                  />
                </Animated.View>
              )}
            </View>
            <TextInput
              style={STYLES.input}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter password"
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>

          {/* Strength bar */}
          {newPassword.length > 0 && <StrengthBar metCount={metCount} />}

          <View style={styles.reqContainer}>
            <Text style={styles.reqTitle}>PASSWORD REQUIREMENTS</Text>
            <RequirementRow
              met={requirements.minLength}
              label="At least 8 characters"
            />
            <RequirementRow
              met={requirements.hasUppercase}
              label="One uppercase letter (A-Z)"
            />
            <RequirementRow
              met={requirements.hasLowercase}
              label="One lowercase letter (a-z)"
            />
            <RequirementRow
              met={requirements.hasNumber}
              label="One number (0-9)"
            />
            <RequirementRow
              met={requirements.hasSpecialChar}
              label="One special character (!@#$...)"
            />
            {confirmPassword.length > 0 && (
              <RequirementRow met={passwordsMatch} label="Passwords match" />
            )}
          </View>

          <Animated.View entering={FadeIn.delay(400).duration(300)}>
            <TouchableOpacity
              style={[
                STYLES.button,
                (!requirements.isValid ||
                  !passwordsMatch ||
                  !currentPasswordFilled ||
                  isLoading) && { opacity: 0.5 },
              ]}
              onPress={handleUpdate}
              disabled={
                !requirements.isValid ||
                !passwordsMatch ||
                !currentPasswordFilled ||
                isLoading
              }
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.btnText}>Set Password</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoClip: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoImage: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 6,
    lineHeight: 22,
    textAlign: "center",
  },
  inputGroup: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  confirmLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  strengthContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },
  strengthTrack: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  strengthFill: {
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: "700",
    minWidth: 44,
  },
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
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  btnText: { color: "white", fontSize: 16, fontWeight: "700" },
});
