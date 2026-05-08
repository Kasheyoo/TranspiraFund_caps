import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useEffect, useRef, useState } from "react";
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

type Severity = "info" | "warning" | "critical";

interface SecurityNoticeOverlayProps {
  visible: boolean;
  severity: Severity;
  title: string;
  message: string;
  primaryLabel?: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  countdownSeconds?: number;
  onCountdownExpire?: () => void;
}

const SEVERITY: Record<
  Severity,
  { color: string; bg: string; border: string; icon: string }
> = {
  info:     { color: COLORS.primary, bg: COLORS.primarySoft, border: COLORS.accentBorder, icon: "info-circle" },
  warning:  { color: COLORS.warning, bg: COLORS.warningSoft, border: "#FDE68A",           icon: "clock" },
  critical: { color: COLORS.error,   bg: COLORS.errorSoft,   border: "#FCA5A5",           icon: "lock" },
};

const formatCountdown = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(safe / 60).toString().padStart(2, "0");
  const ss = (safe % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
};

export const SecurityNoticeOverlay = ({
  visible,
  severity,
  title,
  message,
  primaryLabel = "OK",
  onPrimary,
  secondaryLabel,
  onSecondary,
  countdownSeconds,
  onCountdownExpire,
}: SecurityNoticeOverlayProps) => {
  const cfg = SEVERITY[severity];
  const scale = useRef(new Animated.Value(0.94)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const [remaining, setRemaining] = useState<number | null>(
    typeof countdownSeconds === "number" ? countdownSeconds : null,
  );
  const expiredFiredRef = useRef(false);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 240 }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.94);
      opacity.setValue(0);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      expiredFiredRef.current = false;
      setRemaining(typeof countdownSeconds === "number" ? countdownSeconds : null);
      return;
    }
    if (typeof countdownSeconds !== "number") return;

    setRemaining(countdownSeconds);
    expiredFiredRef.current = false;

    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
      const left = countdownSeconds - elapsedSec;
      if (left <= 0) {
        setRemaining(0);
        clearInterval(interval);
        if (!expiredFiredRef.current) {
          expiredFiredRef.current = true;
          onCountdownExpire?.();
        }
      } else {
        setRemaining(left);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, countdownSeconds, onCountdownExpire]);

  const showSecondary = !!secondaryLabel && !!onSecondary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onPrimary}
    >
      <View style={S.backdrop}>
        <Pressable onPress={() => {}}>
          <Animated.View style={[S.card, { transform: [{ scale }], opacity }]}>
            <View style={[S.iconRing, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
              <FontAwesome5 name={cfg.icon} size={26} color={cfg.color} />
            </View>

            <Text style={S.title}>{title}</Text>
            <Text style={S.body}>{message}</Text>

            {remaining !== null ? (
              <View style={[S.countdown, { borderColor: cfg.border, backgroundColor: cfg.bg }]}>
                <FontAwesome5 name="hourglass-half" size={11} color={cfg.color} />
                <Text style={[S.countdownText, { color: cfg.color }]}>
                  {formatCountdown(remaining)}
                </Text>
              </View>
            ) : null}

            <View style={S.actions}>
              {showSecondary ? (
                <TouchableOpacity
                  style={[S.btn, S.secondaryBtn]}
                  onPress={onSecondary}
                  activeOpacity={0.85}
                >
                  <Text style={S.secondaryText}>{secondaryLabel}</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[S.btn, { backgroundColor: cfg.color }]}
                onPress={onPrimary}
                activeOpacity={0.85}
              >
                <Text style={S.primaryText}>{primaryLabel}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Pressable>
      </View>
    </Modal>
  );
};

const S = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
    elevation: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
  },
  iconRing: {
    width: 68, height: 68, borderRadius: 34,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5,
    marginBottom: 16,
  },
  title: {
    fontSize: 18, fontWeight: "900", color: COLORS.textPrimary,
    textAlign: "center", marginBottom: 8,
  },
  body: {
    fontSize: 13, color: COLORS.textSecondary,
    textAlign: "center", lineHeight: 19, marginBottom: 14,
    paddingHorizontal: 4,
  },
  countdown: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 12, borderWidth: 1.5,
    marginBottom: 14,
  },
  countdownText: {
    fontSize: 16, fontWeight: "900",
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.5,
  },
  actions: { flexDirection: "row", gap: 10, width: "100%" },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtn: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryText: { fontSize: 14, fontWeight: "800", color: COLORS.textSecondary },
  primaryText:   { fontSize: 14, fontWeight: "800", color: "#fff" },
});
