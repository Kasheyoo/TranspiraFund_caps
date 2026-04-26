import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants";
import type { Proof } from "../types";

interface ProofImageViewerProps {
  proof: Proof | null;
  indexLabel?: string;
  onClose: () => void;
}

const COORD_STRING_RE = /^\s*-?\d+\.\d+\s*,\s*-?\d+\.\d+\s*$/;
const isCoordString = (s?: string) => !!s && COORD_STRING_RE.test(s);

export const ProofImageViewer = ({
  proof,
  indexLabel,
  onClose,
}: ProofImageViewerProps) => {
  const insets = useSafeAreaInsets();
  const visible = proof !== null;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0.96)).current;
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (visible) {
      setLoadFailed(false);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(scale,   { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 240 }),
      ]).start();
    } else {
      opacity.setValue(0);
      scale.setValue(0.96);
    }
  }, [visible]);

  if (!proof) return null;

  const lat = proof.gps?.lat ?? proof.latitude;
  const lng = proof.gps?.lng ?? proof.longitude;
  const hasCoords = lat != null && lng != null;
  const placeName = proof.location && !isCoordString(proof.location) ? proof.location : null;

  const openInMaps = () => {
    if (!hasCoords) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={S.backdrop} onPress={onClose}>
        <Animated.View style={[S.container, { opacity }]}>
          {/* Top bar */}
          <View style={[S.topBar, { paddingTop: insets.top + 8 }]}>
            {indexLabel ? (
              <View style={S.indexChip}>
                <FontAwesome5 name="camera" size={10} color="#fff" />
                <Text style={S.indexChipText}>{indexLabel}</Text>
              </View>
            ) : <View />}
            <TouchableOpacity onPress={onClose} style={S.closeBtn} activeOpacity={0.8} hitSlop={10}>
              <FontAwesome5 name="times" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Image zone — swallow taps so they don't dismiss the modal.
              contain keeps aspect so the burnt-in banner at the image bottom
              stays visible. All other metadata (time, coords, engineer) lives
              inside that banner — we don't duplicate it as text rows. */}
          <Pressable style={S.imageZone} onPress={() => {}}>
            <Animated.View style={{ flex: 1, width: "100%", transform: [{ scale }] }}>
              {loadFailed ? (
                <View style={S.failBox}>
                  <FontAwesome5 name="image" size={32} color="rgba(255,255,255,0.4)" />
                  <Text style={S.failText}>Photo unavailable</Text>
                </View>
              ) : (
                <Image
                  source={{ uri: proof.url }}
                  style={S.image}
                  resizeMode="contain"
                  onError={() => setLoadFailed(true)}
                />
              )}
            </Animated.View>
          </Pressable>

          {/* Location chip only — opens Google Maps. Capture time, coords,
              engineer are already burnt into the image itself, so we don't
              duplicate them outside. Lifted into the thumb-zone (~64px above
              the safe-area edge) so the user doesn't have to over-reach. */}
          {placeName ? (
            <Pressable
              style={[S.chipStrip, { paddingBottom: insets.bottom + 64 }]}
              onPress={() => {}}
            >
              <TouchableOpacity
                onPress={openInMaps}
                activeOpacity={0.85}
                disabled={!hasCoords}
                style={[S.chip, S.chipPrimary]}
                hitSlop={8}
              >
                <FontAwesome5 name="map-marker-alt" size={13} color="#fff" />
                <Text style={[S.chipText, { maxWidth: 240 }]} numberOfLines={1}>
                  {placeName}
                </Text>
                {hasCoords ? (
                  <FontAwesome5 name="external-link-alt" size={11} color="#fff" />
                ) : null}
              </TouchableOpacity>
            </Pressable>
          ) : (
            <View style={{ paddingBottom: insets.bottom + 64 }} />
          )}
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const S = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.94)",
  },
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  indexChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  indexChipText: { color: "#fff", fontSize: 12, fontWeight: "800", letterSpacing: 0.3 },
  closeBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center", justifyContent: "center",
  },
  imageZone: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  image: { flex: 1, width: "100%" },
  failBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  failText: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "600" },
  chipStrip: {
    paddingTop: 22,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 999,
    minHeight: 44,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  chipPrimary: {
    backgroundColor: COLORS.primary,
  },
  chipText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
