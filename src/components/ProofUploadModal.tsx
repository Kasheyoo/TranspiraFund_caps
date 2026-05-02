import { useEffect, useRef, useState } from "react";
import {
  Animated,
  AppState,
  type AppStateStatus,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { COLORS } from "../constants";
import type { ProofUploadStage } from "../services/ProofUploadService";

interface Props {
  visible: boolean;
  stage: ProofUploadStage;
  percent: number;
  error?: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const baseLabel = (stage: ProofUploadStage, percent: number): string => {
  switch (stage) {
    case "preparing":
      return "Preparing...";
    case "uploading":
      return `Uploading ${percent}%`;
    case "finalizing":
      return "Finalizing...";
    case "done":
      return "Done";
    case "error":
      return "Upload failed";
  }
};

const targetPct = (stage: ProofUploadStage, percent: number): number => {
  if (stage === "preparing") return 4;
  if (stage === "uploading") return Math.max(4, percent);
  if (stage === "finalizing" || stage === "done") return 100;
  return 0;
};

export const ProofUploadModal = ({
  visible,
  stage,
  percent,
  error,
  onRetry,
  onDismiss,
}: Props) => {
  const shimmer = useRef(new Animated.Value(0)).current;
  const widthAnim = useRef(new Animated.Value(0)).current;
  const lastForegroundRef = useRef<AppStateStatus>(AppState.currentState);
  const [resuming, setResuming] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (stage === "done" || stage === "error") {
      shimmer.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, stage, shimmer]);

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: targetPct(stage, percent),
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [stage, percent, widthAnim]);

  useEffect(() => {
    if (!visible) return;
    const sub = AppState.addEventListener("change", (next) => {
      const prev = lastForegroundRef.current;
      lastForegroundRef.current = next;
      if (
        next === "active" &&
        (prev === "background" || prev === "inactive") &&
        (stage === "uploading" || stage === "preparing" || stage === "finalizing")
      ) {
        setResuming(true);
        setTimeout(() => setResuming(false), 1500);
      }
    });
    return () => sub.remove();
  }, [visible, stage]);

  const isError = stage === "error";
  const isDone = stage === "done";
  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.65, 1],
  });
  const accent = isError ? COLORS.error : COLORS.success;
  const label = resuming && !isError && !isDone ? "Resuming upload..." : baseLabel(stage, percent);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (isError) onDismiss?.();
      }}
    >
      <View style={S.backdrop}>
        <View style={S.sheet}>
          <View style={[S.iconBox, { backgroundColor: isError ? COLORS.errorSoft : COLORS.successSoft }]}>
            <FontAwesome5
              name={isError ? "exclamation-circle" : isDone ? "check-circle" : "cloud-upload-alt"}
              size={22}
              color={accent}
            />
          </View>

          <Text style={S.title}>{isError ? "Upload Failed" : isDone ? "Saved" : "Saving Proof"}</Text>

          {isError ? (
            <>
              <Text style={S.errText}>{error || "Something went wrong."}</Text>
              <View style={S.btnRow}>
                {onDismiss ? (
                  <TouchableOpacity
                    style={S.secondaryBtn}
                    onPress={onDismiss}
                    activeOpacity={0.85}
                  >
                    <Text style={S.secondaryBtnText}>Cancel</Text>
                  </TouchableOpacity>
                ) : null}
                {onRetry ? (
                  <TouchableOpacity
                    style={S.primaryBtn}
                    onPress={onRetry}
                    activeOpacity={0.85}
                  >
                    <FontAwesome5 name="redo" size={11} color="#fff" />
                    <Text style={S.primaryBtnText}>Retry</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </>
          ) : (
            <>
              <View style={S.barTrack}>
                <Animated.View
                  style={[
                    S.barFill,
                    {
                      width: widthAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ["0%", "100%"],
                      }),
                      opacity,
                      backgroundColor: accent,
                    },
                  ]}
                />
              </View>

              <View style={S.statusRow}>
                <Text style={S.stageText}>{label}</Text>
                {stage === "uploading" && !resuming ? (
                  <Text style={[S.pctText, { color: accent }]}>{percent}%</Text>
                ) : null}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const S = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  sheet: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.textPrimary,
  },
  barTrack: {
    width: "100%",
    height: 10,
    backgroundColor: COLORS.track,
    borderRadius: 5,
    overflow: "hidden",
    marginTop: 10,
  },
  barFill: {
    height: "100%",
    borderRadius: 5,
  },
  statusRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  stageText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  pctText: {
    fontSize: 13,
    fontWeight: "900",
  },
  errText: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 6,
    marginTop: 2,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    width: "100%",
    justifyContent: "center",
  },
  secondaryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.textSecondary,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.success,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
});
