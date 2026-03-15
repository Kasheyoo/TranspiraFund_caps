import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
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
import { isValidEmail, sanitizeInput } from "../utils/security";

interface ForgotPasswordModalProps {
  visible?: boolean;
  onClose: () => void;
  onSend: (email: string) => void;
  isLoading?: boolean;
}

export const ForgotPasswordModal = ({
  visible,
  onClose,
  onSend,
  isLoading,
}: ForgotPasswordModalProps) => {
  const [resetEmail, setResetEmail] = useState("");
  const [error, setError] = useState("");

  const handleSend = () => {
    setError("");
    const cleaned = sanitizeInput(resetEmail, 254);
    if (!cleaned) {
      setError("Please enter your email address.");
      return;
    }
    if (!isValidEmail(cleaned)) {
      setError("Please enter a valid email address.");
      return;
    }
    onSend(cleaned);
    setResetEmail("");
  };

  const handleClose = () => {
    setResetEmail("");
    setError("");
    onClose();
  };

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
                A secure reset link will be sent to your registered email.
              </Text>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <FontAwesome5 name="exclamation-circle" size={12} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Registered Email</Text>
              <TextInput
                style={[STYLES.input, error ? { borderColor: COLORS.error } : {}]}
                placeholder="name@lgu.gov.ph"
                placeholderTextColor={COLORS.textTertiary}
                value={resetEmail}
                onChangeText={(t) => {
                  setResetEmail(t);
                  if (error) setError("");
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[STYLES.button, isLoading && { opacity: 0.8 }]}
              onPress={handleSend}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.btnText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleClose} style={styles.cancelBtn}>
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
    backgroundColor: COLORS.primarySoft,
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
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.errorSoft,
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
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
