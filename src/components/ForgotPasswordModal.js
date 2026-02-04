import { FontAwesome5 } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS, STYLES } from "../constants";
import { useForgotPasswordPresenter } from "../presenters/useForgotPasswordPresenter";
import { BlockInput, PrimaryButton } from "./SharedComponents";

const ForgotPasswordModal = ({ visible, onClose }) => {
  // Connect the Presenter Logic
  const { data, actions } = useForgotPasswordPresenter(onClose);
  const { employeeId, isLoading } = data;
  const { handleEmployeeIdChange, handleResetPassword, handleCancel } = actions;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalContainer, STYLES.shadow]}>
          <View style={styles.iconCircle}>
            <FontAwesome5 name="key" size={24} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subTitle}>
            Enter your Employee ID. We will send a reset link to your registered
            email.
          </Text>

          <View style={{ width: "100%", marginTop: 10 }}>
            <BlockInput
              icon="id-card"
              placeholder="Employee ID"
              value={employeeId}
              onChangeText={handleEmployeeIdChange}
            />
          </View>

          {isLoading ? (
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
              style={{ marginTop: 20 }}
            />
          ) : (
            <PrimaryButton
              title="Send Reset Link"
              onPress={handleResetPassword}
              style={{ width: "100%", marginTop: 10 }}
            />
          )}

          <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textDark,
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 14,
    color: COLORS.textGrey,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  cancelBtn: {
    marginTop: 16,
    padding: 8,
  },
  cancelText: {
    color: COLORS.textGrey,
    fontWeight: "600",
  },
});

export default ForgotPasswordModal;
