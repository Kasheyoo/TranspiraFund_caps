import { useEffect } from "react";
import {
  AppState,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { COLORS } from "../constants";

interface DeviceLockRequiredScreenProps {
  onRecheck: () => void;
}

export const DeviceLockRequiredScreen = ({ onRecheck }: DeviceLockRequiredScreenProps) => {

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") onRecheck();
    });
    return () => sub.remove();
  }, [onRecheck]);

  const openSettings = () => {
    Linking.sendIntent("android.settings.SECURITY_SETTINGS").catch(() => {

      Linking.openSettings().catch(() => {});
    });
  };

  return (
    <SafeAreaView style={S.root}>
      <View style={S.iconRing}>
        <FontAwesome5 name="shield-alt" size={64} color="#FFFFFF" />
      </View>
      <Text style={S.title}>Set Up a Screen Lock</Text>
      <Text style={S.body}>
        TranspiraFund requires a PIN, pattern, password, or fingerprint on your
        phone before continuing. Open Settings → Security to set one up, then
        tap Check Again.
      </Text>

      <View style={S.actions}>
        <TouchableOpacity
          style={[S.btn, S.primaryBtn]}
          onPress={openSettings}
          activeOpacity={0.85}
        >
          <Text style={S.primaryText}>Open Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[S.btn, S.secondaryBtn]}
          onPress={onRecheck}
          activeOpacity={0.85}
        >
          <Text style={S.secondaryText}>Check Again</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const S = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconRing: {
    width: 128, height: 128, borderRadius: 64,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 28,
  },
  title: {
    fontSize: 22, fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
  },
  body: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 28,
  },
  actions: { width: "100%", gap: 10 },
  btn: {
    paddingVertical: 14,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    backgroundColor: "#FFFFFF",
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.55)",
  },
  primaryText: { fontSize: 15, fontWeight: "800", color: COLORS.primary },
  secondaryText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
});
