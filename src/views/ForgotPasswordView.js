import { FontAwesome5 } from "@expo/vector-icons";
import { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { COLORS, STYLES } from "../constants";

export const ForgotPasswordModal = ({
  visible,
  onClose,
  onSend,
  isLoading,
}) => {
  const [resetEmail, setResetEmail] = useState("");

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.card}>
            <View style={styles.modalHeader}>
              <View style={styles.iconCircle}>
                <FontAwesome5
                  name="envelope-open-text"
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <Text style={styles.modalSubtitle}>
                A secure reset link will be sent to your Gmail.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Registered Email</Text>
              <TextInput
                style={STYLES.input}
                placeholder="name@lgu.gov.ph"
                value={resetEmail}
                onChangeText={setResetEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[STYLES.button, isLoading && { opacity: 0.8 }]}
              onPress={() => onSend(resetEmail)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.btnText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 24,
  },
  modalContainer: { justifyContent: "center" },
  card: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    elevation: 10,
  },
  modalHeader: { alignItems: "center", marginBottom: 24 },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: COLORS.textPrimary },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  btnText: { color: "white", fontSize: 16, fontWeight: "700" },
  cancelBtn: { marginTop: 15, alignItems: "center" },
  cancelText: { color: COLORS.textTertiary, fontWeight: "600" },
});
