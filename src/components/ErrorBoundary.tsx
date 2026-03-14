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
    console.error("💥 Global Error Caught:", error, errorInfo);
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
            <FontAwesome5
              name="exclamation-triangle"
              size={60}
              color={COLORS.error || "#FF0000"}
            />
            <Text style={styles.title}>Whoops!</Text>
            <Text style={styles.subTitle}>
              Something went wrong. We caught the error so the app wouldn't
              crash.
            </Text>

            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {this.state.error?.toString()}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={this.handleRestart}
            >
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    padding: 24,
  },
  content: { alignItems: "center" },
  title: { fontSize: 28, fontWeight: "800", color: "#1E293B", marginTop: 20 },
  subTitle: {
    textAlign: "center",
    color: "#64748B",
    marginTop: 10,
    fontSize: 16,
  },
  errorBox: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    width: "100%",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: { color: "#EF4444", fontSize: 12, fontFamily: "monospace" },
  button: {
    marginTop: 30,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    elevation: 4,
  },
  buttonText: { color: "white", fontWeight: "700", fontSize: 16 },
});
