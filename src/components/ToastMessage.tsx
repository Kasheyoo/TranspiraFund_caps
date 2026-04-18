import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants";

type ToastType = "success" | "error" | "info";

interface ToastMessageProps {
  visible: boolean;
  type?: ToastType;
  message: string;
  onHide: () => void;
  duration?: number;
}

const CONFIG: Record<ToastType, { icon: string; color: string; bg: string; border: string }> = {
  success: { icon: "check-circle", color: COLORS.success,  bg: COLORS.successSoft, border: "#A7F3D0" },
  error:   { icon: "times-circle", color: COLORS.error,    bg: COLORS.errorSoft,   border: "#FCA5A5" },
  info:    { icon: "info-circle",  color: COLORS.primary,  bg: COLORS.primarySoft, border: COLORS.accentBorder },
};

export const ToastMessage = ({
  visible,
  type = "success",
  message,
  onHide,
  duration = 3000,
}: ToastMessageProps) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const cfg = CONFIG[type];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 200 }),
        Animated.timing(opacity,    { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      const t = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, { toValue: -120, duration: 300, useNativeDriver: true }),
          Animated.timing(opacity,    { toValue: 0,    duration: 300, useNativeDriver: true }),
        ]).start(() => onHide());
      }, duration);

      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        S.container,
        { top: insets.top + 12, transform: [{ translateY }], opacity },
        { backgroundColor: cfg.bg, borderColor: cfg.border },
      ]}
    >
      <View style={[S.iconBox, { backgroundColor: cfg.color + "18" }]}>
        <FontAwesome5 name={cfg.icon} size={16} color={cfg.color} />
      </View>
      <Text style={[S.message, { color: cfg.color }]}>{message}</Text>
    </Animated.View>
  );
};

const S = StyleSheet.create({
  container: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    zIndex: 999,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  iconBox: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  message: { flex: 1, fontSize: 14, fontWeight: "700", lineHeight: 20 },
});
