import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../constants";

type ConfirmTone = "primary" | "success" | "danger" | "warning";

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  icon?: string;
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const TONE: Record<ConfirmTone, { color: string; bg: string; border: string; icon: string }> = {
  primary: { color: COLORS.primary, bg: COLORS.primarySoft, border: COLORS.accentBorder, icon: "info-circle" },
  success: { color: COLORS.success, bg: COLORS.successSoft, border: "#A7F3D0",           icon: "check-circle" },
  danger:  { color: COLORS.error,   bg: COLORS.errorSoft,   border: "#FCA5A5",           icon: "exclamation-circle" },
  warning: { color: COLORS.warning, bg: COLORS.warningSoft, border: "#FDE68A",           icon: "exclamation-triangle" },
};

export const ConfirmModal = ({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel  = "Cancel",
  tone         = "primary",
  icon,
  isBusy       = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) => {
  const cfg = TONE[tone];
  const scale   = useRef(new Animated.Value(0.94)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale,   { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 240 }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.94);
      opacity.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Pressable style={S.backdrop} onPress={isBusy ? undefined : onCancel}>
        {/* Stop the inner card from forwarding the press to the backdrop */}
        <Pressable onPress={() => {}}>
          <Animated.View style={[S.card, { transform: [{ scale }], opacity }]}>
            <View style={[S.iconRing, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
              <FontAwesome5 name={icon || cfg.icon} size={22} color={cfg.color} />
            </View>

            <Text style={S.title}>{title}</Text>
            <Text style={S.body}>{message}</Text>

            <View style={S.actions}>
              <TouchableOpacity
                style={[S.btn, S.cancelBtn]}
                onPress={onCancel}
                activeOpacity={0.85}
                disabled={isBusy}
              >
                <Text style={S.cancelText}>{cancelLabel}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[S.btn, { backgroundColor: cfg.color }, isBusy && { opacity: 0.7 }]}
                onPress={onConfirm}
                activeOpacity={0.85}
                disabled={isBusy}
              >
                <Text style={S.confirmText}>{isBusy ? "Working…" : confirmLabel}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const S = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 22,
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
    elevation: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  iconRing: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5,
    marginBottom: 14,
  },
  title: {
    fontSize: 17, fontWeight: "900", color: COLORS.textPrimary,
    textAlign: "center", marginBottom: 6,
  },
  body: {
    fontSize: 13, color: COLORS.textSecondary,
    textAlign: "center", lineHeight: 19, marginBottom: 18,
    paddingHorizontal: 4,
  },
  actions: { flexDirection: "row", gap: 10, width: "100%" },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelText:  { fontSize: 14, fontWeight: "800", color: COLORS.textSecondary },
  confirmText: { fontSize: 14, fontWeight: "800", color: "#fff" },
});
