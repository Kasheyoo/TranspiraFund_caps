import { FontAwesome5 } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { COLORS, STYLES } from "../constants";
import type { UserProfile } from "../types";

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
  onLogout: () => void;
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
  const [passwords, setPasswords] = useState<PasswordState>({
    current: "",
    new: "",
    confirm: "",
  });
  const [updating, setUpdating] = useState(false);
  const [isCurrentCorrect, setIsCurrentCorrect] = useState<boolean | null>(null);
  const [verifying, setVerifying] = useState(false);

  const requirements = useMemo(() => {
    const letterCount = (passwords.new.match(/[a-zA-Z]/g) || []).length;
    const hasNumber = /\d/.test(passwords.new);
    return { minLetters: letterCount >= 4, hasNumber };
  }, [passwords.new]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (passwords.current.length >= 6) {
        setVerifying(true);
        const isValid = await actions.verifyCurrentPassword(passwords.current);
        setIsCurrentCorrect(isValid);
        setVerifying(false);
      } else {
        setIsCurrentCorrect(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [passwords.current]);

  const handleUpdatePassword = async () => {
    if (!isCurrentCorrect)
      return Alert.alert("Error", "Current password incorrect.");
    if (passwords.new !== passwords.confirm)
      return Alert.alert("Error", "Passwords do not match.");
    if (!requirements.minLetters || !requirements.hasNumber)
      return Alert.alert("Security", "Requirements not met.");

    setUpdating(true);
    const success = await actions.onChangePassword(passwords.current, passwords.new);
    setUpdating(false);

    if (success) {
      setModalVisible(false);
      setPasswords({ current: "", new: "", confirm: "" });
      setIsCurrentCorrect(null);
      Alert.alert("Success", "Password changed successfully.");
    }
  };

  if (isLoading && !userProfile) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={STYLES.container}>
      <View style={[styles.nav, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={actions.goBack} style={styles.backBtn}>
          <FontAwesome5 name="arrow-left" size={18} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {userProfile?.photoURL ? (
              <Image
                source={{ uri: userProfile.photoURL }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.initialsCircle}>
                <Text style={styles.initialsText}>
                  {userProfile?.firstName?.charAt(0) || "?"}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.userName}>
            {userProfile?.firstName} {userProfile?.lastName}
          </Text>
          <Text style={styles.userRole}>
            {userProfile?.role === "PROJ_ENG"
              ? "Project Engineer"
              : userProfile?.role}
          </Text>
        </View>

        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>OFFICIAL INFORMATION</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email Address</Text>
              <Text style={styles.infoValue}>{userProfile?.email || "N/A"}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Department</Text>
              <Text style={styles.infoValue}>
                {userProfile?.department || "N/A"}
              </Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
            SECURITY & ACCOUNT
          </Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setModalVisible(true)}
            >
              <View style={styles.menuItemLead}>
                <FontAwesome5
                  name="lock"
                  size={14}
                  color={COLORS.textSecondary}
                  style={{ marginRight: 12 }}
                />
                <Text style={styles.menuItemText}>Change Password</Text>
              </View>
              <FontAwesome5 name="chevron-right" size={12} color={COLORS.textTertiary} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={actions.onLogout}
            >
              <View style={styles.menuItemLead}>
                <FontAwesome5
                  name="sign-out-alt"
                  size={14}
                  color={COLORS.error}
                  style={{ marginRight: 12 }}
                />
                <Text style={[styles.menuItemText, { color: COLORS.error }]}>
                  Log Out
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Change Password</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <FontAwesome5 name="times" size={18} color={COLORS.textTertiary} />
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.inputWrapper,
                  isCurrentCorrect === true && styles.validBorder,
                  isCurrentCorrect === false && styles.invalidBorder,
                ]}
              >
                <TextInput
                  style={styles.textInput}
                  secureTextEntry
                  placeholder="Current Password"
                  value={passwords.current}
                  onChangeText={(t) => setPasswords({ ...passwords, current: t })}
                />
                {verifying && <ActivityIndicator size="small" />}
              </View>

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  secureTextEntry
                  placeholder="New Password"
                  value={passwords.new}
                  onChangeText={(t) => setPasswords({ ...passwords, new: t })}
                />
              </View>

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  secureTextEntry
                  placeholder="Confirm New Password"
                  value={passwords.confirm}
                  onChangeText={(t) => setPasswords({ ...passwords, confirm: t })}
                />
              </View>

              <View style={styles.checklistContainer}>
                <View style={styles.reqRow}>
                  <FontAwesome5
                    name={requirements.minLetters ? "check-circle" : "circle"}
                    size={10}
                    color={requirements.minLetters ? COLORS.success : COLORS.textTertiary}
                  />
                  <Text
                    style={[
                      styles.reqText,
                      requirements.minLetters && { color: COLORS.success },
                    ]}
                  >
                    At least 4 letters
                  </Text>
                </View>
                <View style={styles.reqRow}>
                  <FontAwesome5
                    name={requirements.hasNumber ? "check-circle" : "circle"}
                    size={10}
                    color={requirements.hasNumber ? COLORS.success : COLORS.textTertiary}
                  />
                  <Text
                    style={[
                      styles.reqText,
                      requirements.hasNumber && { color: COLORS.success },
                    ]}
                  >
                    At least 1 number
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleUpdatePassword}
                disabled={updating || !isCurrentCorrect}
              >
                {updating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.saveBtnText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 10,
    alignItems: "center",
  },
  backBtn: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 16,
    color: COLORS.textPrimary,
  },
  profileHeader: { alignItems: "center", paddingTop: 20, paddingBottom: 30 },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  initialsCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: { color: "white", fontSize: 32, fontWeight: "700" },
  userName: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginTop: 15,
  },
  userRole: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 4,
    textTransform: "uppercase",
  },
  contentSection: { paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textTertiary,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 4,
    elevation: 2,
  },
  infoRow: { padding: 12 },
  infoLabel: {
    fontSize: 10,
    color: COLORS.textTertiary,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: "700",
    marginTop: 2,
  },
  divider: { height: 1, backgroundColor: "#F1F3F5", marginHorizontal: 12 },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    alignItems: "center",
  },
  menuItemLead: { flexDirection: "row", alignItems: "center" },
  menuItemText: { fontSize: 15, fontWeight: "600", color: COLORS.textPrimary },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContainer: { justifyContent: "center" },
  modalContent: { backgroundColor: "white", borderRadius: 24, padding: 24 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: { fontSize: 19, fontWeight: "800", color: COLORS.textPrimary },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  validBorder: { borderColor: COLORS.success, borderWidth: 1.5 },
  invalidBorder: { borderColor: COLORS.error, borderWidth: 1.5 },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  checklistContainer: { marginBottom: 16, paddingHorizontal: 4 },
  reqRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  reqText: {
    fontSize: 11,
    marginLeft: 8,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  saveBtn: {
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: COLORS.primary,
    marginTop: 8,
  },
  saveBtnText: { fontWeight: "800", color: "white", fontSize: 16 },
});
