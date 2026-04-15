import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { COLORS } from "../constants";

interface MilestoneGenerationModalProps {
  visible: boolean;
  onClose: () => void;
}

export const MilestoneGenerationModal = ({ visible, onClose }: MilestoneGenerationModalProps) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={S.backdrop} />
      </TouchableWithoutFeedback>

      {/* Card — centered */}
      <View style={S.wrapper} pointerEvents="box-none">
        <View style={S.card}>

          {/* Top orbs */}
          <View style={S.orb1} /><View style={S.orb2} />

          {/* Icon */}
          <View style={S.iconRing}>
            <View style={S.iconCircle}>
              <FontAwesome5 name="robot" size={28} color={COLORS.primary} />
            </View>
          </View>

          {/* Badge */}
          <View style={S.badge}>
            <View style={S.badgeDot} />
            <Text style={S.badgeText}>Under Development</Text>
          </View>

          {/* Title */}
          <Text style={S.title}>AI Milestone Generation</Text>

          {/* Description */}
          <Text style={S.desc}>
            This feature is being upgraded to an AI-powered milestone generator. It will automatically create project-specific construction phases based on the scope, budget, and site conditions.
          </Text>

          {/* Divider */}
          <View style={S.divider} />

          {/* Feature preview list */}
          {[
            { icon: "brain",        text: "Scope-aware phase planning" },
            { icon: "calendar-alt", text: "Timeline-based scheduling"  },
            { icon: "coins",        text: "Budget-aligned milestones"  },
          ].map((item) => (
            <View key={item.icon} style={S.featureRow}>
              <View style={S.featureIcon}>
                <FontAwesome5 name={item.icon} size={11} color={COLORS.primary} />
              </View>
              <Text style={S.featureText}>{item.text}</Text>
            </View>
          ))}

          {/* Close button */}
          <TouchableOpacity style={S.closeBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={S.closeBtnText}>Got It</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
};

const S = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: 28,
    width: "100%",
    alignItems: "center",
    overflow: "hidden",
    elevation: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  orb1: {
    position: "absolute", width: 180, height: 180, borderRadius: 90,
    backgroundColor: COLORS.primarySoft, top: -70, right: -60,
  },
  orb2: {
    position: "absolute", width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.primarySoft, bottom: -40, left: -30,
  },

  // ── Icon ──────────────────────────────────────────────────────
  iconRing: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
    borderWidth: 2, borderColor: COLORS.accentBorder,
  },
  iconCircle: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: COLORS.border,
  },

  // ── Badge ─────────────────────────────────────────────────────
  badge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: COLORS.warningSoft,
    borderWidth: 1, borderColor: "#FDE68A",
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, marginBottom: 14,
  },
  badgeDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: COLORS.warning,
  },
  badgeText: { fontSize: 11, fontWeight: "800", color: COLORS.warning },

  // ── Text ──────────────────────────────────────────────────────
  title: {
    fontSize: 20, fontWeight: "900", color: COLORS.textPrimary,
    textAlign: "center", marginBottom: 10,
  },
  desc: {
    fontSize: 13, color: COLORS.textSecondary, textAlign: "center",
    lineHeight: 20, fontWeight: "500", marginBottom: 20,
  },

  divider: { height: 1, backgroundColor: COLORS.border, width: "100%", marginBottom: 16 },

  // ── Feature rows ──────────────────────────────────────────────
  featureRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    alignSelf: "stretch", marginBottom: 10,
  },
  featureIcon: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  featureText: { fontSize: 13, fontWeight: "600", color: COLORS.textSecondary, flex: 1 },

  // ── Close button ──────────────────────────────────────────────
  closeBtn: {
    marginTop: 20, width: "100%",
    backgroundColor: COLORS.primary,
    paddingVertical: 14, borderRadius: 16,
    alignItems: "center",
  },
  closeBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
});
