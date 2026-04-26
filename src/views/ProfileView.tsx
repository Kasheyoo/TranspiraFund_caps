import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { launchImageLibrary } from "react-native-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ToastMessage } from "../components/ToastMessage";
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
  lguName: string | null;
}

interface ProfileActions {
  goBack: () => void;
  verifyCurrentPassword: (password: string) => Promise<boolean>;
  onChangePassword: (current: string, newPass: string) => Promise<boolean>;
  uploadProfilePhoto: (base64: string) => Promise<boolean>;
  removeProfilePhoto: () => Promise<boolean>;
}

interface ProfileViewProps {
  data: ProfileData;
  actions: ProfileActions;
}

export const ProfileView = ({ data, actions }: ProfileViewProps) => {
  const insets = useSafeAreaInsets();
  const { userProfile, isLoading, lguName } = data || {};

  // ── Password modal state ────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [passwords, setPasswords] = useState<PasswordState>({ current: "", new: "", confirm: "" });
  const [updating, setUpdating] = useState(false);
  const [isCurrentCorrect, setIsCurrentCorrect] = useState<boolean | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyTimer, setVerifyTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Photo state ─────────────────────────────────────────────
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);
  const [pendingPhotoBase64, setPendingPhotoBase64] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);

  // ── Toast ───────────────────────────────────────────────────
  const [toast, setToast] = useState<{ visible: boolean; type: "success" | "error" | "info"; message: string }>({
    visible: false, type: "success", message: "",
  });
  const showToast = (type: "success" | "error" | "info", message: string) =>
    setToast({ visible: true, type, message });

  // ── Derived ─────────────────────────────────────────────────
  const requirements = useMemo(() => validatePassword(passwords.new), [passwords.new]);
  const passwordsMatch = passwords.new.length > 0 && passwords.new === passwords.confirm;

  const displayName = userProfile?.firstName
    ? `${userProfile.firstName} ${userProfile.lastName || ""}`.trim()
    : userProfile?.name || "User";
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const roleDisplay =
    userProfile?.role === "PROJ_ENG" ? "Project Engineer" : userProfile?.role || "Engineer";

  const photoToShow = pendingPhotoUri || (userProfile?.photoURL || "");

  // ── Password handlers ────────────────────────────────────────
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
    if (!isCurrentCorrect) return showToast("error", "Current password is incorrect.");
    if (!requirements.isValid) return showToast("error", "Please meet all password requirements.");
    if (!passwordsMatch) return showToast("error", "Passwords do not match.");
    setUpdating(true);
    const success = await actions.onChangePassword(passwords.current, passwords.new);
    setUpdating(false);
    if (success) {
      setModalVisible(false);
      setPasswords({ current: "", new: "", confirm: "" });
      setIsCurrentCorrect(null);
      showToast("success", "Password updated successfully!");
    } else {
      showToast("error", "Failed to update password. Please try again.");
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setPasswords({ current: "", new: "", confirm: "" });
    setIsCurrentCorrect(null);
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  // ── Photo handlers ───────────────────────────────────────────
  const handlePickPhoto = async () => {
    setShowPhotoSheet(false);
    const result = await launchImageLibrary({
      mediaType: "photo",
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
      includeBase64: true,
    });
    const asset = result.assets?.[0];
    if (asset?.uri && asset?.base64) {
      setPendingPhotoUri(asset.uri);
      setPendingPhotoBase64(asset.base64);
    }
  };

  const cancelPendingPhoto = () => {
    setPendingPhotoUri(null);
    setPendingPhotoBase64(null);
  };

  const handleUploadPhoto = async () => {
    if (!pendingPhotoBase64) return;
    setUploadingPhoto(true);
    const success = await actions.uploadProfilePhoto(pendingPhotoBase64);
    setUploadingPhoto(false);
    cancelPendingPhoto();
    showToast(success ? "success" : "error", success ? "Profile photo updated!" : "Failed to upload photo. Try again.");
  };

  const handleRemovePhoto = async () => {
    setShowPhotoSheet(false);
    const success = await actions.removeProfilePhoto();
    showToast(success ? "success" : "error", success ? "Profile photo removed." : "Failed to remove photo.");
  };

  if (isLoading && !userProfile) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* ── Toast (above everything) ─────────────────────────── */}
      <ToastMessage
        visible={toast.visible}
        type={toast.type}
        message={toast.message}
        onHide={() => setToast((t) => ({ ...t, visible: false }))}
      />

      {/* ── Header ───────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={actions.goBack} activeOpacity={0.7}>
          <FontAwesome5 name="arrow-left" size={18} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Teal Hero Card ─────────────────────────────────── */}
        <View style={styles.profileCard}>
          <View style={styles.profileBanner}>
            <View style={styles.orbA} />
            <View style={styles.orbB} />

            {/* Avatar + camera button */}
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarRing}>
                {photoToShow ? (
                  <Image source={{ uri: photoToShow }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.cameraBtn}
                onPress={() => setShowPhotoSheet(true)}
                activeOpacity={0.85}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <FontAwesome5 name="camera" size={11} color="#fff" />
                }
              </TouchableOpacity>
            </View>

            {/* Pending photo actions */}
            {pendingPhotoUri && (
              <View style={styles.pendingActions}>
                <TouchableOpacity style={styles.cancelPhotoBtn} onPress={cancelPendingPhoto} activeOpacity={0.8}>
                  <Text style={styles.cancelPhotoText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.uploadPhotoBtn} onPress={handleUploadPhoto} disabled={uploadingPhoto} activeOpacity={0.85}>
                  <FontAwesome5 name="cloud-upload-alt" size={11} color="#fff" />
                  <Text style={styles.uploadPhotoText}>Upload Photo</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.heroName}>{displayName}</Text>
            <View style={styles.roleBadge}>
              <FontAwesome5 name="hard-hat" size={10} color="#FFFFFF" />
              <Text style={styles.roleText}>{roleDisplay}</Text>
            </View>
          </View>
        </View>

        {/* ── Official Information ──────────────────────────── */}
        <Text style={styles.sectionHeading}>OFFICIAL INFORMATION</Text>
        <View style={styles.infoCard}>
          <InfoRow icon="envelope" label="Email Address" value={userProfile?.email || "—"} />
          <View style={styles.infoDivider} />
          <InfoRow icon="tools" label="Division" value={userProfile?.department || "Construction Services Division"} />
          <View style={styles.infoDivider} />
          <InfoRow icon="id-badge" label="Position" value={roleDisplay} />
          <View style={styles.infoDivider} />
          <InfoRow icon="landmark" label="Organization" value={lguName ?? "—"} />
        </View>

        {/* ── Security ─────────────────────────────────────── */}
        <Text style={styles.sectionHeading}>SECURITY</Text>
        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionItem} onPress={() => setModalVisible(true)} activeOpacity={0.7}>
            <View style={[styles.actionIconBox, { backgroundColor: "#EDE9FE" }]}>
              <FontAwesome5 name="key" size={14} color="#7C3AED" />
            </View>
            <Text style={styles.actionLabel}>Change Password</Text>
            <FontAwesome5 name="angle-right" size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ── Photo Action Sheet ────────────────────────────────── */}
      <Modal visible={showPhotoSheet} transparent animationType="slide" onRequestClose={() => setShowPhotoSheet(false)}>
        <TouchableWithoutFeedback onPress={() => setShowPhotoSheet(false)}>
          <View style={styles.sheetOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.sheetContainer}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>Profile Photo</Text>

                <TouchableOpacity style={styles.sheetOption} onPress={handlePickPhoto} activeOpacity={0.8}>
                  <View style={[styles.sheetOptionIcon, { backgroundColor: COLORS.primarySoft }]}>
                    <FontAwesome5 name="images" size={16} color={COLORS.primary} />
                  </View>
                  <Text style={styles.sheetOptionText}>Choose from Library</Text>
                </TouchableOpacity>

                {!!userProfile?.photoURL && (
                  <TouchableOpacity style={styles.sheetOption} onPress={handleRemovePhoto} activeOpacity={0.8}>
                    <View style={[styles.sheetOptionIcon, { backgroundColor: COLORS.errorSoft }]}>
                      <FontAwesome5 name="trash-alt" size={16} color={COLORS.error} />
                    </View>
                    <Text style={[styles.sheetOptionText, { color: COLORS.error }]}>Remove Photo</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.sheetCancel} onPress={() => setShowPhotoSheet(false)} activeOpacity={0.8}>
                  <Text style={styles.sheetCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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
            <View style={[
              styles.inputWrapper,
              isCurrentCorrect === true && styles.validBorder,
              isCurrentCorrect === false && styles.invalidBorder,
            ]}>
              <FontAwesome5
                name="lock"
                size={14}
                color={isCurrentCorrect === false ? COLORS.error : COLORS.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                secureTextEntry={!showCurrent}
                placeholder="Current Password"
                placeholderTextColor={COLORS.textTertiary}
                value={passwords.current}
                onChangeText={handleCurrentPasswordChange}
              />
              {/* Clear button */}
              {passwords.current.length > 0 && !verifying && (
                <TouchableOpacity onPress={() => { setPasswords((p) => ({ ...p, current: "" })); setIsCurrentCorrect(null); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <FontAwesome5 name="times-circle" size={14} color={COLORS.textTertiary} />
                </TouchableOpacity>
              )}
              {verifying && <ActivityIndicator size="small" color={COLORS.primary} />}
              {!verifying && isCurrentCorrect === true && (
                <FontAwesome5 name="check-circle" size={14} color={COLORS.success} />
              )}
              {!verifying && isCurrentCorrect === false && (
                <FontAwesome5 name="times-circle" size={14} color={COLORS.error} />
              )}
              {/* Eye toggle */}
              <TouchableOpacity onPress={() => setShowCurrent((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <FontAwesome5 name={showCurrent ? "eye-slash" : "eye"} size={14} color={COLORS.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* New Password */}
            <View style={styles.inputWrapper}>
              <FontAwesome5 name="key" size={14} color={COLORS.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                secureTextEntry={!showNew}
                placeholder="New Password"
                placeholderTextColor={COLORS.textTertiary}
                value={passwords.new}
                onChangeText={(t) => setPasswords((p) => ({ ...p, new: t }))}
              />
              {passwords.new.length > 0 && (
                <TouchableOpacity onPress={() => setPasswords((p) => ({ ...p, new: "" }))} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <FontAwesome5 name="times-circle" size={14} color={COLORS.textTertiary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setShowNew((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <FontAwesome5 name={showNew ? "eye-slash" : "eye"} size={14} color={COLORS.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* Confirm Password */}
            <View style={[
              styles.inputWrapper,
              passwords.confirm.length > 0 && (passwordsMatch ? styles.validBorder : styles.invalidBorder),
            ]}>
              <FontAwesome5 name="check" size={14} color={COLORS.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                secureTextEntry={!showConfirm}
                placeholder="Confirm New Password"
                placeholderTextColor={COLORS.textTertiary}
                value={passwords.confirm}
                onChangeText={(t) => setPasswords((p) => ({ ...p, confirm: t }))}
              />
              {passwords.confirm.length > 0 && (
                <TouchableOpacity onPress={() => setPasswords((p) => ({ ...p, confirm: "" }))} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <FontAwesome5 name="times-circle" size={14} color={COLORS.textTertiary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <FontAwesome5 name={showConfirm ? "eye-slash" : "eye"} size={14} color={COLORS.textTertiary} />
              </TouchableOpacity>
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

// ── Reusable info row ─────────────────────────────────────────
const InfoRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconBox}>
      <FontAwesome5 name={icon} size={13} color={COLORS.primary} />
    </View>
    <View style={styles.infoTextGroup}>
      <Text style={styles.infoCaption}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // ── Header ────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 8, width: 40, alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: COLORS.textPrimary },

  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 },

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
    position: "absolute", width: 200, height: 200, borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.06)", top: -60, right: -40,
  },
  orbB: {
    position: "absolute", width: 160, height: 160, borderRadius: 80,
    backgroundColor: "rgba(0,0,0,0.06)", bottom: -60, left: -30,
  },

  // Avatar
  avatarWrapper: { position: "relative", marginBottom: 16 },
  avatarRing: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatarCircle: {
    width: 78, height: 78, borderRadius: 39,
    backgroundColor: "#FFFFFF",
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { color: COLORS.primary, fontSize: 28, fontWeight: "900" },
  cameraBtn: {
    position: "absolute", bottom: 0, right: -4,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.primary,
    borderWidth: 2.5, borderColor: "#fff",
    alignItems: "center", justifyContent: "center",
    elevation: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },

  // Pending photo actions
  pendingActions: {
    flexDirection: "row", gap: 10, marginBottom: 12, marginTop: -4,
  },
  cancelPhotoBtn: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.4)",
  },
  cancelPhotoText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  uploadPhotoBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  uploadPhotoText: { fontSize: 12, fontWeight: "800", color: COLORS.primary },

  heroName: { fontSize: 22, fontWeight: "900", color: "#FFFFFF", marginBottom: 10, letterSpacing: 0.2 },
  roleBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20,
  },
  roleText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF", letterSpacing: 0.3 },

  // ── Section headings ──────────────────────────────────────
  sectionHeading: {
    fontSize: 11, fontWeight: "800", color: COLORS.textSecondary,
    letterSpacing: 1.2, marginBottom: 10, paddingHorizontal: 4,
  },

  // ── Info Card ─────────────────────────────────────────────
  infoCard: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 16, paddingVertical: 4,
    marginBottom: 24,
    elevation: 1, shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
  },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13, gap: 14 },
  infoIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.primarySoft, alignItems: "center", justifyContent: "center",
  },
  infoTextGroup: { flex: 1 },
  infoCaption: {
    fontSize: 11, fontWeight: "700", color: COLORS.textTertiary,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2,
  },
  infoValue: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary },
  infoDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: 50 },

  // ── Actions Card ──────────────────────────────────────────
  actionsCard: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: "hidden", marginBottom: 20,
    elevation: 1, shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
  },
  actionItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 15, gap: 14 },
  actionIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: COLORS.textPrimary },

  // ── Photo Action Sheet ────────────────────────────────────
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheetContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 36,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: "center", marginBottom: 20,
  },
  sheetTitle: { fontSize: 16, fontWeight: "900", color: COLORS.textPrimary, marginBottom: 16 },
  sheetOption: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14 },
  sheetOptionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sheetOptionText: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary },
  sheetCancel: {
    marginTop: 8, paddingVertical: 15,
    borderRadius: 14, alignItems: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  sheetCancelText: { fontSize: 15, fontWeight: "700", color: COLORS.textSecondary },

  // ── Modal ─────────────────────────────────────────────────
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "900", color: COLORS.textPrimary },
  modalSubtitle: { fontSize: 13, color: COLORS.textTertiary, fontWeight: "500", marginTop: 3 },
  modalCloseBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center",
  },
  inputWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.background, borderRadius: 12,
    marginBottom: 10, paddingHorizontal: 14, paddingVertical: 2,
    borderWidth: 1.5, borderColor: COLORS.border, gap: 10,
  },
  inputIcon: { width: 18, textAlign: "center" },
  validBorder: { borderColor: COLORS.success },
  invalidBorder: { borderColor: COLORS.error },
  textInput: {
    flex: 1, paddingVertical: 13,
    fontSize: 15, fontWeight: "600", color: COLORS.textPrimary,
  },
  checklist: { marginVertical: 12, paddingHorizontal: 4, gap: 5 },
  reqRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  reqText: { fontSize: 12, color: COLORS.textTertiary, fontWeight: "600" },
  saveBtn: { padding: 16, borderRadius: 14, alignItems: "center", backgroundColor: COLORS.primary, marginTop: 4 },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { fontWeight: "800", color: "#FFFFFF", fontSize: 16 },
});
