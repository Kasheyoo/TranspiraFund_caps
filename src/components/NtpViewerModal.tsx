import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import Pdf from "react-native-pdf";
import { COLORS } from "../constants";

interface Props {
  visible: boolean;
  onClose: () => void;
  fileUrl?: string | null;
  fileName?: string | null;
}

type FileKind = "image" | "pdf" | "unsupported";

const detectKind = (name?: string | null): FileKind => {
  if (!name) return "unsupported";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "jpg" || ext === "jpeg" || ext === "png") return "image";
  if (ext === "pdf") return "pdf";
  return "unsupported";
};

export const NtpViewerModal = ({ visible, onClose, fileUrl, fileName }: Props) => {
  const kind = detectKind(fileName);
  const { width, height } = Dimensions.get("window");
  const sheetW = Math.min(width - 24, 720);
  const contentW = sheetW - 24;
  const contentH = Math.max(220, height - 220);

  const openExternal = () => {
    if (!fileUrl) return;
    Linking.openURL(fileUrl).catch(() => {});
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={S.backdrop} onPress={onClose}>
        <Pressable
          style={[S.sheet, { width: sheetW, maxHeight: height - 80 }]}
          onPress={(e) => e.stopPropagation?.()}
        >
          <View style={S.header}>
            <View style={S.titleWrap}>
              <FontAwesome5
                name={kind === "pdf" ? "file-pdf" : kind === "image" ? "file-image" : "file"}
                size={13}
                color={COLORS.primary}
              />
              <Text style={S.title} numberOfLines={1}>
                {fileName ?? "NTP Document"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <FontAwesome5 name="times" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={S.body}>
            {!fileUrl ? (
              <Text style={S.empty}>No file URL.</Text>
            ) : kind === "image" ? (
              <Image
                source={{ uri: fileUrl }}
                style={{ width: contentW, height: contentH }}
                resizeMode="contain"
              />
            ) : kind === "pdf" ? (
              <Pdf
                source={{ uri: fileUrl, cache: true }}
                style={{ width: contentW, height: contentH, backgroundColor: COLORS.background }}
                trustAllCerts={false}
                renderActivityIndicator={() => (
                  <ActivityIndicator color={COLORS.primary} />
                )}
              />
            ) : (
              <View style={S.unsupported}>
                <View style={S.unsupportedIconBox}>
                  <FontAwesome5 name="file" size={26} color={COLORS.textTertiary} />
                </View>
                <Text style={S.unsupportedTitle}>Unsupported file type</Text>
                <Text style={S.unsupportedBody}>
                  This file can&apos;t be previewed in the app. Open it externally to view.
                </Text>
                <TouchableOpacity
                  style={S.primaryBtn}
                  onPress={openExternal}
                  activeOpacity={0.85}
                >
                  <FontAwesome5 name="external-link-alt" size={11} color="#fff" />
                  <Text style={S.primaryBtnText}>Open externally</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {fileUrl && kind !== "unsupported" ? (
            <View style={S.footer}>
              <TouchableOpacity
                style={S.secondaryBtn}
                onPress={openExternal}
                activeOpacity={0.85}
              >
                <FontAwesome5 name="external-link-alt" size={11} color={COLORS.primary} />
                <Text style={S.secondaryBtnText}>Open externally</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const S = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  titleWrap: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, marginRight: 12 },
  title: { fontSize: 13, fontWeight: "800", color: COLORS.textPrimary, flex: 1 },
  body: { padding: 12, alignItems: "center", justifyContent: "center" },
  empty: { fontSize: 13, color: COLORS.textTertiary, padding: 16 },
  unsupported: { alignItems: "center", gap: 10, paddingVertical: 28, paddingHorizontal: 16 },
  unsupportedIconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  unsupportedTitle: { fontSize: 15, fontWeight: "800", color: COLORS.textPrimary },
  unsupportedBody: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 17,
    fontWeight: "600",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  primaryBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  footer: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: "flex-end",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.primarySoft,
  },
  secondaryBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: "800" },
});
