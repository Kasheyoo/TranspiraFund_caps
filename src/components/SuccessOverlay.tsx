import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { Modal, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { COLORS } from "../constants";
import { PrimaryButton } from "./SharedComponents";

interface SuccessOverlayProps {
  visible: boolean;
  title: string;
  message: string;
  buttonText?: string;
  onDismiss: () => void;
}

export const SuccessOverlay = ({
  visible,
  title,
  message,
  buttonText = "Continue",
  onDismiss,
}: SuccessOverlayProps) => {
  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.backdrop}>
        <Animated.View
          entering={FadeIn.delay(100).duration(350)}
          style={styles.card}
        >
          {/* Success icon */}
          <Animated.View
            entering={FadeIn.delay(300).duration(400)}
            style={styles.iconCircle}
          >
            <FontAwesome5 name="check" size={32} color="#FFFFFF" />
          </Animated.View>

          {/* Title */}
          <Animated.Text
            entering={FadeInUp.delay(450).duration(400)}
            style={styles.title}
          >
            {title}
          </Animated.Text>

          {/* Message */}
          <Animated.Text
            entering={FadeInUp.delay(550).duration(400)}
            style={styles.message}
          >
            {message}
          </Animated.Text>

          {/* Divider */}
          <Animated.View
            entering={FadeIn.delay(600).duration(300)}
            style={styles.divider}
          />

          {/* Button */}
          <Animated.View
            entering={FadeInUp.delay(650).duration(400)}
            style={styles.buttonWrap}
          >
            <PrimaryButton
              title={buttonText}
              onPress={onDismiss}
              icon="arrow-right"
              style={{ width: "100%" }}
            />
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderTopWidth: 4,
    borderTopColor: COLORS.success,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    width: "100%",
    marginBottom: 24,
  },
  buttonWrap: {
    width: "100%",
  },
});
