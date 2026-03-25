import { StyleSheet } from "react-native";
import { COLORS } from "./colors";

export const TIMING = {
  entrance: 500,
  stagger: 80,
  buttonPress: 150,
  inputFocus: 200,
} as const;

export const TYPOGRAPHY = {
  h1: { fontSize: 28, fontWeight: "800" as const, color: COLORS.textPrimary, letterSpacing: -0.3 },
  h2: { fontSize: 22, fontWeight: "700" as const, color: COLORS.textPrimary },
  h3: { fontSize: 18, fontWeight: "700" as const, color: COLORS.textPrimary },
  body: { fontSize: 16, color: COLORS.textSecondary, lineHeight: 24 },
  label: { fontSize: 14, fontWeight: "700" as const, color: COLORS.textPrimary },
  labelCaps: { fontSize: 12, fontWeight: "800" as const, color: COLORS.textTertiary, letterSpacing: 1.2 },
  caption: { fontSize: 13, color: COLORS.textTertiary, lineHeight: 18 },
} as const;

export const STYLES = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    elevation: 3,
    shadowColor: "#64748B",
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  button: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    elevation: 4,
  },
});
