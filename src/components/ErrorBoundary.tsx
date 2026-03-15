import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../constants";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error for debugging (production: send to error reporting service)
    console.error("ErrorBoundary caught:", error.message);
    if (errorInfo.componentStack) {
      console.error("Component stack:", errorInfo.componentStack);
    }
  }

  handleRestart = (): void => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconCircle}>
              <FontAwesome5
                name="exclamation-triangle"
                size={32}
                color={COLORS.error}
              />
            </View>
            <Text style={styles.title}>Something Went Wrong</Text>
            <Text style={styles.subTitle}>
              An unexpected error occurred. Please try again or restart the app.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={this.handleRestart}
            >
              <FontAwesome5 name="redo" size={14} color="white" />
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.versionText}>TranspiraFund v1.0.6</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    padding: 32,
  },
  content: { alignItems: "center" },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.errorSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  subTitle: {
    textAlign: "center",
    color: COLORS.textSecondary,
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  primaryButton: {
    marginTop: 32,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    elevation: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  primaryButtonText: { color: "white", fontWeight: "700", fontSize: 16 },
  versionText: {
    textAlign: "center",
    color: COLORS.textTertiary,
    fontSize: 12,
    marginTop: 60,
  },
});
