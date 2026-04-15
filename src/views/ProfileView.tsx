import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants";
import type { UserProfile } from "../types";
import { validatePassword } from "../utils/security";

interface PasswordState {
  current: string;
  new: string;
  confirm: string;
}

interface ProfileData {
  userProfile: UserProfile | null;
  isLoading: boolean;
}

interface ProfileActions {
  goBack: () => void;
  verifyCurrentPassword: (password: string) => Promise<boolean>;
  onChangePassword: (current: string, newPass: string) => Promise<boolean>;
}

interface ProfileViewProps {
  data: ProfileData;
  actions: ProfileActions;
}

export const ProfileView = ({ data, actions }: ProfileViewProps) => {
  const insets = useSafeAreaInsets();
  const { userProfile, isLoading } = data || {};

  const [modalVisible, setModalVisible] = useState(false);
  const [passwords, setPasswords] = useState<PasswordState>({ current: "", new: "", confirm: "" });
  const [updating, setUpdating] = useState(false);
  const [isCurrentCorrect, setIsCurrentCorrect] = useState<boolean | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyTimer, setVerifyTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const requirements = useMemo(() => validatePassword(passwords.new), [passwords.new]);
  const passwordsMatch = passwords.new.length > 0 && passwords.new === passwords.confirm;

  const displayName = userProfile?.firstName
    ? `${userProfile.firstName} ${userProfile.lastName || ""}`.trim()
    : userProfile?.name || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const roleDisplay =
    userProfile?.role === "PROJ_ENG" ? "Project Engineer" : userProfile?.role || "Engineer";

  const handleCurrentPasswordChange = (text: string) => {
    setPasswords((prev) => ({ ...prev, current: text }));
    setIsCurrentCorrect(null);
    if (verifyTimer) clearTimeout(verifyTimer);
    if (text.length >= 6) {
      const t = setTimeout(async () => {
        setVerifying(true);
        const valid = await actions.verifyCurrentPassword(text);
        setIsCurrentCorrect(valid);
        setVerifying(false);
      }, 500);
      setVerifyTimer(t);
    }
  };

  const handleUpdatePassword = async () => {
    if (!isCurrentCorrect) return Alert.alert("Error", "Current password is incorrect.");
    if (!requirements.isValid) return Alert.alert("Security", "Please meet all password requirements.");
    if (!passwordsMatch) return Alert.alert("Error", "Passwords do not match.");
    setUpdating(true);
    const success = await actions.onChangePassword(passwords.current, passwords.new);
    setUpdating(false);
    if (success) {
      setModalVisible(false);
      setPasswords({ current: "", new: "", confirm: "" });
      setIsCurrentCorrect(null);
      Alert.alert("Success", "Your password has been updated.");
    } else {
      Alert.alert("Error", "Failed to update password. Please try again.");
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setPasswords({ current: "", new: "", confirm: "" });
    setIsCurrentCorrect(null);
  };

  if (isLoading && !userProfile) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={actions.goBack} activeOpacity={0.7}>
          <FontAwesome5 name="arrow-left" size={18} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Teal Hero Card ──────────────────────────────────── */}
        <View style={styles.profileCard}>
          <View style={styles.profileBanner}>
            <View style={styles.orbA} />
            <View style={styles.orbB} />

            <View style={styles.avatarRing}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </View>

            <Text style={styles.heroName}>{displayName}</Text>
            <View style={styles.roleBadge}>
              <FontAwesome5 name="hard-hat" size={10} color="#FFFFFF" />
              <Text style={styles.roleText}>{roleDisplay}</Text>
            </View>
          </View>
        </View>

        {/* ── Official Information ─────────────────────────────── */}
        <Text style={styles.sectionHeading}>OFFICIAL INFORMATION</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <FontAwesome5 name="envelope" size={13} color={COLORS.primary} />
            </View>
            <View style={styles.infoTextGroup}>
              <Text style={styles.infoCaption}>Email Address</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{userProfile?.email || "—"}</Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <FontAwesome5 name="tools" size={13} color={COLORS.primary} />
            </View>
            <View style={styles.infoTextGroup}>
              <Text style={styles.infoCaption}>Division</Text>
              <Text style={styles.infoValue}>
                {userProfile?.department || "Construction Services Division"}
              </Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <FontAwesome5 name="id-badge" size={13} color={COLORS.primary} />
            </View>
            <View style={styles.infoTextGroup}>
              <Text style={styles.infoCaption}>Position</Text>
              <Text style={styles.infoValue}>{roleDisplay}</Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <FontAwesome5 name="landmark" size={13} color={COLORS.primary} />
            </View>
            <View style={styles.infoTextGroup}>
              <Text style={styles.infoCaption}>Organization</Text>
              <Text style={styles.infoValue}>
                Construction Services Division
              </Text>
            </View>
          </View>
        </View>

        {/* ── Security ─────────────────────────────────────────── */}
        <Text style={styles.sectionHeading}>SECURITY</Text>
        <View style={styles.actionsCard}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: "#EDE9FE" }]}>
              <FontAwesome5 name="key" size={14} color="#7C3AED" />
            </View>
            <Text style={styles.actionLabel}>Change Password</Text>
            <FontAwesome5 name="angle-right" size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ── Change Password Modal ─────────────────────────────── */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalSheet}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Change Password</Text>
                <Text style={styles.modalSubtitle}>Enter your current password to continue</Text>
              </View>
              <TouchableOpacity onPress={closeModal} style={styles.modalCloseBtn}>
                <FontAwesome5 name="times" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Current Password */}
            <View
              style={[
                styles.inputWrapper,
                isCurrentCorrect === true && styles.validBorder,
                isCurrentCorrect === false && styles.invalidBorder,
              ]}
            >
              <FontAwesome5
                name="lock"
                size={14}
                color={isCurrentCorrect === false ? COLORS.error : COLORS.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                secureTextEntry
                placeholder="Current Password"
                placeholderTextColor={COLORS.textTertiary}
                value={passwords.current}
                onChangeText={handleCurrentPasswordChange}
              />
              {verifying && <ActivityIndicator size="small" color={COLORS.primary} />}
              {!verifying && isCurrentCorrect === true && (
                <FontAwesome5 name="check-circle" size={14} color={COLORS.success} />
              )}
              {!verifying && isCurrentCorrect === false && (
                <FontAwesome5 name="times-circle" size={14} color={COLORS.error} />
              )}
            </View>

            {/* New Password */}
            <View style={styles.inputWrapper}>
              <FontAwesome5 name="key" size={14} color={COLORS.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                secureTextEntry
                placeholder="New Password"
                placeholderTextColor={COLORS.textTertiary}
                value={passwords.new}
                onChangeText={(t) => setPasswords((p) => ({ ...p, new: t }))}
              />
            </View>

            {/* Confirm Password */}
            <View
              style={[
                styles.inputWrapper,
                passwords.confirm.length > 0 && (passwordsMatch ? styles.validBorder : styles.invalidBorder),
              ]}
            >
              <FontAwesome5 name="check" size={14} color={COLORS.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                secureTextEntry
                placeholder="Confirm New Password"
                placeholderTextColor={COLORS.textTertiary}
                value={passwords.confirm}
                onChangeText={(t) => setPasswords((p) => ({ ...p, confirm: t }))}
              />
            </View>

            {/* Requirements checklist */}
            <View style={styles.checklist}>
              {[
                { met: requirements.minLength, label: "At least 8 characters" },
                { met: requirements.hasUppercase, label: "One uppercase letter (A–Z)" },
                { met: requirements.hasLowercase, label: "One lowercase letter (a–z)" },
                { met: requirements.hasNumber, label: "One number (0–9)" },
                { met: requirements.hasSpecialChar, label: "One special character" },
                ...(passwords.confirm.length > 0
                  ? [{ met: passwordsMatch, label: "Passwords match" }]
                  : []),
              ].map((req) => (
                <View key={req.label} style={styles.reqRow}>
                  <FontAwesome5
                    name={req.met ? "check-circle" : "circle"}
                    size={10}
                    color={req.met ? COLORS.success : COLORS.textTertiary}
                  />
                  <Text style={[styles.reqText, req.met && { color: COLORS.success }]}>
                    {req.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[
                styles.saveBtn,
                (!isCurrentCorrect || !requirements.isValid || !passwordsMatch) && styles.saveBtnDisabled,
              ]}
              onPress={handleUpdatePassword}
              disabled={updating || !isCurrentCorrect || !requirements.isValid || !passwordsMatch}
              activeOpacity={0.8}
            >
              {updating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // ── Header ────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    padding: 8,
    width: 40,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 60,
  },

  // ── Profile Hero ──────────────────────────────────────────
  profileCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  profileBanner: {
    backgroundColor: COLORS.primary,
    alignItems: "center",
    paddingTop: 36,
    paddingBottom: 32,
    overflow: "hidden",
  },
  orbA: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -60,
    right: -40,
  },
  orbB: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(0,0,0,0.06)",
    bottom: -60,
    left: -30,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: 28,
    fontWeight: "900",
  },
  heroName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  // ── Section headings ──────────────────────────────────────
  sectionHeading: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  // ── Info Card ─────────────────────────────────────────────
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 24,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    gap: 14,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTextGroup: { flex: 1 },
  infoCaption: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  infoValueBold: {
    fontWeight: "900",
    color: COLORS.primary,
  },
  infoDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 50,
  },

  // ── Actions Card ──────────────────────────────────────────
  actionsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    marginBottom: 20,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 14,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },

  // ── Modal ─────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textTertiary,
    fontWeight: "500",
    marginTop: 3,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 10,
  },
  inputIcon: { width: 18, textAlign: "center" },
  validBorder: { borderColor: COLORS.success },
  invalidBorder: { borderColor: COLORS.error },
  textInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  checklist: {
    marginVertical: 12,
    paddingHorizontal: 4,
    gap: 5,
  },
  reqRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  reqText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontWeight: "600",
  },
  saveBtn: {
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: COLORS.primary,
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { fontWeight: "800", color: "#FFFFFF", fontSize: 16 },
});
