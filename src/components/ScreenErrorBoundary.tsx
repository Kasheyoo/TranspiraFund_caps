import { Component, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { COLORS } from "../constants";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  componentStack: string | null;
}

export class ScreenErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(_error: Error, info: { componentStack: string }) {
    this.setState({ componentStack: info.componentStack });
  }

  reset = () => this.setState({ error: null, componentStack: null });

  render() {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={S.root}>
        <ScrollView contentContainerStyle={S.scroll}>
          <View style={S.iconBox}>
            <FontAwesome5 name="exclamation-triangle" size={28} color="#fff" />
          </View>
          <Text style={S.title}>Something went wrong</Text>
          <Text style={S.subtitle}>
            The app caught an error and recovered. Please share the details
            below with support if it keeps happening.
          </Text>

          <View style={S.card}>
            <Text style={S.cardLabel}>ERROR</Text>
            <Text selectable style={S.errMsg}>
              {error.name}: {error.message}
            </Text>
          </View>

          {error.stack ? (
            <View style={S.card}>
              <Text style={S.cardLabel}>STACK</Text>
              <Text selectable style={S.stack}>
                {error.stack}
              </Text>
            </View>
          ) : null}

          {componentStack ? (
            <View style={S.card}>
              <Text style={S.cardLabel}>COMPONENT TREE</Text>
              <Text selectable style={S.stack}>
                {componentStack}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity style={S.btn} onPress={this.reset} activeOpacity={0.85}>
            <FontAwesome5 name="redo" size={12} color={COLORS.primary} />
            <Text style={S.btnText}>Try again</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.primary },
  scroll: { padding: 24, paddingTop: 80, gap: 14 },
  iconBox: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
    alignSelf: "center", marginBottom: 6,
  },
  title: {
    fontSize: 22, fontWeight: "900", color: "#fff",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13, color: "rgba(255,255,255,0.8)",
    textAlign: "center", lineHeight: 19, marginBottom: 8,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14, padding: 14, gap: 6,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  cardLabel: {
    fontSize: 10, fontWeight: "900", letterSpacing: 1,
    color: "rgba(255,255,255,0.7)",
  },
  errMsg: {
    fontSize: 13, fontWeight: "700", color: "#fff",
    lineHeight: 18,
  },
  stack: {
    fontSize: 11, color: "rgba(255,255,255,0.85)",
    fontFamily: "monospace", lineHeight: 16,
  },
  btn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#fff", paddingVertical: 13, borderRadius: 14,
    marginTop: 4,
  },
  btnText: { fontSize: 14, fontWeight: "800", color: COLORS.primary },
});
