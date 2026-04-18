import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useState } from "react";
import {
  Image,
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

interface MenuItem {
  label: string;
  sub: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  danger?: boolean;
  onPress: () => void;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export const SettingsView = ({ onLogout, onNavigate }: SettingsViewProps) => {
  const insets = useSafeAreaInsets();
  const { userProfile } = useAuth();
  const [isLogoutVisible, setIsLogoutVisible] = useState(false);

  const displayName = userProfile?.firstName
    ? `${userProfile.firstName} ${userProfile.lastName || ""}`.trim()
    : userProfile?.name || "User";

  const initials = displayName
    .split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const roleDisplay =
    userProfile?.role === "PROJ_ENG" ? "Project Engineer" : userProfile?.role || "Engineer";

  const sections: MenuSection[] = [
    {
      title: "MY ACCOUNT",
      items: [
        {
          label: "View Profile",
          sub: "Personal info & change password",
          icon: "user-circle",
          iconBg: COLORS.primarySoft,
          iconColor: COLORS.primary,
          onPress: () => onNavigate("ProfileView"),
        },
      ],
    },
    {
      title: "ACTIVITY",
      items: [
        {
          label: "Audit Trail",
          sub: "Your field activity log",
          icon: "history",
          iconBg: "#EDE9FE",
          iconColor: "#7C3AED",
          onPress: () => onNavigate("AuditTrail"),
        },
      ],
    },
    {
      title: "SESSION",
      items: [
        {
          label: "Log Out",
          sub: "Sign out of your account",
          icon: "sign-out-alt",
          iconBg: COLORS.errorSoft,
          iconColor: COLORS.error,
          danger: true,
          onPress: () => setIsLogoutVisible(true),
        },
      ],
    },
  ];

  return (
    <View style={S.root}>
      <ScrollView
        contentContainerStyle={[S.scroll, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ══ HERO ══════════════════════════════════════════════ */}
        <View style={[S.hero, { paddingTop: insets.top + 24 }]}>
          <View style={S.orb1} /><View style={S.orb2} />

          <View style={S.avatarRing}>
            <View style={S.avatarCircle}>
              {userProfile?.photoURL ? (
                <Image source={{ uri: userProfile.photoURL }} style={S.avatarImg} />
              ) : (
                <Text style={S.avatarText}>{initials}</Text>
              )}
            </View>
          </View>

          <Text style={S.heroName}>{displayName}</Text>

          <View style={S.roleChip}>
            <FontAwesome5 name="hard-hat" size={10} color="rgba(255,255,255,0.85)" />
            <Text style={S.roleText}>{roleDisplay}</Text>
          </View>

          <Text style={S.divisionText}>Construction Services Division</Text>
        </View>

        {/* ══ MENU SECTIONS ══════════════════════════════════════ */}
        {sections.map((section) => (
          <View key={section.title} style={S.section}>
            <Text style={S.sectionLabel}>{section.title}</Text>
            <View style={S.menuCard}>
              {section.items.map((item, idx) => (
                <View key={item.label}>
                  <TouchableOpacity
                    style={S.menuItem}
                    onPress={item.onPress}
                    activeOpacity={0.75}
                  >
                    <View style={[S.menuIconBox, { backgroundColor: item.iconBg }]}>
                      <FontAwesome5 name={item.icon} size={15} color={item.iconColor} />
                    </View>
                    <View style={S.menuTextCol}>
                      <Text style={[S.menuLabel, item.danger && { color: COLORS.error }]}>
                        {item.label}
                      </Text>
                      <Text style={S.menuSub}>{item.sub}</Text>
                    </View>
                    <FontAwesome5
                      name="chevron-right"
                      size={11}
                      color={item.danger ? COLORS.error + "80" : COLORS.textTertiary}
                    />
                  </TouchableOpacity>
                  {idx < section.items.length - 1 && (
                    <View style={S.menuDivider} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* ══ VERSION ════════════════════════════════════════════ */}
        <View style={S.versionRow}>
          <FontAwesome5 name="shield-alt" size={11} color={COLORS.textTertiary} />
          <Text style={S.versionText}>TranspiraFund · Version 1</Text>
        </View>

      </ScrollView>

      <LogoutModal
        visible={isLogoutVisible}
        onClose={() => setIsLogoutVisible(false)}
        onConfirm={() => { setIsLogoutVisible(false); onLogout(); }}
      />
    </View>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root:  { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1 },

  // ── Hero ────────────────────────────────────────────────────
  hero: {
    backgroundColor: COLORS.primary,
    alignItems: "center",
    paddingBottom: 36,
    overflow: "hidden",
  },
  orb1: {
    position: "absolute", width: 220, height: 220, borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.06)", top: -60, right: -60,
  },
  orb2: {
    position: "absolute", width: 130, height: 130, borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.04)", bottom: -40, left: -20,
  },

  avatarRing: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
    borderWidth: 2, borderColor: "rgba(255,255,255,0.3)",
  },
  avatarCircle: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg:    { width: 76, height: 76, borderRadius: 38 },
  avatarText:   { fontSize: 26, fontWeight: "900", color: COLORS.primary },
  heroName:     { fontSize: 20, fontWeight: "900", color: "#fff", marginBottom: 12 },
  roleChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.28)",
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    marginBottom: 10,
  },
  roleText:     { fontSize: 12, fontWeight: "700", color: "#fff" },
  divisionText: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.65)" },

  // ── Menu sections ────────────────────────────────────────────
  section: { marginHorizontal: 20, marginTop: 24 },
  sectionLabel: {
    fontSize: 10, fontWeight: "900", color: COLORS.textTertiary,
    letterSpacing: 1, marginBottom: 8, paddingHorizontal: 2,
  },
  menuCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: "hidden",
    elevation: 1, shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
  },
  menuItem: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 16, gap: 14,
    minHeight: 64,
  },
  menuIconBox: {
    width: 42, height: 42, borderRadius: 13,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  menuTextCol: { flex: 1 },
  menuLabel:   { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary },
  menuSub:     { fontSize: 11, color: COLORS.textTertiary, marginTop: 2, fontWeight: "500" },
  menuDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: 72 },

  // ── Version ──────────────────────────────────────────────────
  versionRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, marginTop: 32, marginBottom: 8,
  },
  versionText: { fontSize: 12, fontWeight: "500", color: COLORS.textTertiary },
});
