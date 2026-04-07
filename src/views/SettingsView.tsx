import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../constants";
import { LogoutModal } from "../components/LogoutModal";

interface SettingsViewProps {
  onLogout: () => void;
  onNavigate: (screen: string) => void;
}

export const SettingsView = ({ onLogout, onNavigate }: SettingsViewProps) => {
  const insets = useSafeAreaInsets();
  const { userProfile } = useAuth();
  const [isLogoutVisible, setIsLogoutVisible] = useState(false);

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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Page title */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Hero ─────────────────────────────────── */}
        <View style={styles.profileCard}>
          {/* Teal background panel */}
          <View style={styles.profileBanner}>
            {/* Decorative orbs */}
            <View style={styles.orbA} />
            <View style={styles.orbB} />

            {/* Avatar */}
            <View style={styles.avatarRing}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </View>

            {/* Name + role */}
            <Text style={styles.heroName}>{displayName}</Text>
            <View style={styles.roleBadge}>
              <FontAwesome5 name="hard-hat" size={10} color="#FFFFFF" />
              <Text style={styles.roleText}>{roleDisplay}</Text>
            </View>
          </View>

          {/* White info panel */}
          <View style={styles.profileInfoPanel}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <FontAwesome5 name="tools" size={13} color={COLORS.primary} />
              </View>
              <Text style={styles.infoLabel}>Construction Division</Text>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <FontAwesome5 name="landmark" size={13} color={COLORS.primary} />
              </View>
              <Text style={styles.infoLabel}>
                Dept. of Public Works{" "}
                <Text style={styles.infoLabelBold}>(DEPW)</Text>
              </Text>
            </View>

            {userProfile?.email ? (
              <>
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                  <View style={styles.infoIconBox}>
                    <FontAwesome5 name="envelope" size={13} color={COLORS.primary} />
                  </View>
                  <Text style={styles.infoLabel} numberOfLines={1}>
                    {userProfile.email}
                  </Text>
                </View>
              </>
            ) : null}
          </View>

          {/* View Profile button */}
          <TouchableOpacity
            style={styles.viewProfileBtn}
            onPress={() => onNavigate("ProfileView")}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="user-circle" size={14} color={COLORS.primary} />
            <Text style={styles.viewProfileText}>View Full Profile</Text>
            <FontAwesome5 name="angle-right" size={14} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* ── Action Items ─────────────────────────────────── */}
        <View style={styles.actionsGroup}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => onNavigate("AuditTrail")}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: "#EDE9FE" }]}>
              <FontAwesome5 name="history" size={15} color="#7C3AED" />
            </View>
            <Text style={styles.actionLabel}>Audit Trail</Text>
            <FontAwesome5 name="angle-right" size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => setIsLogoutVisible(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: COLORS.errorSoft }]}>
              <FontAwesome5 name="sign-out-alt" size={15} color={COLORS.error} />
            </View>
            <Text style={[styles.actionLabel, { color: COLORS.error }]}>Log Out</Text>
            <FontAwesome5 name="angle-right" size={16} color={COLORS.error + "80"} />
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>TranspiraFund v1.0.6</Text>
      </ScrollView>

      <LogoutModal
        visible={isLogoutVisible}
        onClose={() => setIsLogoutVisible(false)}
        onConfirm={() => { setIsLogoutVisible(false); onLogout(); }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  pageHeader: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  // ── Profile Hero ───────────────────────────────────────────
  profileCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  profileBanner: {
    backgroundColor: COLORS.primary,
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 28,
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
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: 26,
    fontWeight: "900",
  },
  heroName: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 8,
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

  // ── Info panel ────────────────────────────────────────────
  profileInfoPanel: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  infoIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  infoLabelBold: {
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  infoDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 46,
  },

  // ── View Profile button ───────────────────────────────────
  viewProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primarySoft,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  viewProfileText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },

  // ── Action items ──────────────────────────────────────────
  actionsGroup: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
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
  actionDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 70,
  },

  versionText: {
    textAlign: "center",
    color: COLORS.textTertiary,
    fontSize: 12,
    fontWeight: "500",
  },
});
