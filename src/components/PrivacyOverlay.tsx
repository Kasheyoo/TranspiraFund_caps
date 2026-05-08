import { Image, StyleSheet, View } from "react-native";
import { COLORS } from "../constants";

interface PrivacyOverlayProps {
  visible: boolean;
}

export const PrivacyOverlay = ({ visible }: PrivacyOverlayProps) => {
  if (!visible) return null;
  return (
    <View style={S.root} pointerEvents="none">
      <View style={S.logoBox}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={S.logo}
          resizeMode="cover"
        />
      </View>
    </View>
  );
};

const S = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBox: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  logo: { width: 110, height: 110, borderRadius: 55 },
});
