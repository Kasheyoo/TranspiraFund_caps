import { Platform } from "react-native";

export const COLORS = {
  // Brand Colors (Modern Trust Blue)
  primary: "#2563EB", // Vibrant Blue
  primarySoft: "#DBEAFE", // Light Blue (Backgrounds)
  primaryDark: "#1E40AF", // Deep Blue

  // Status Colors
  success: "#10B981", // Emerald
  successSoft: "#D1FAE5",
  warning: "#F59E0B", // Amber
  warningSoft: "#FEF3C7",
  error: "#EF4444", // Red
  errorSoft: "#FEE2E2",

  // Neutrals
  background: "#F1F5F9", // Cool Grey Background (Best for cards)
  surface: "#FFFFFF", // Pure White Cards
  border: "#E2E8F0", // Subtle Borders

  // Text
  textPrimary: "#0F172A", // Navy Black
  textSecondary: "#64748B", // Slate
  textTertiary: "#94A3B8", // Light Slate
  textInverse: "#FFFFFF", // White
};

export const STYLES = {
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Modern Soft Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)", // Glass-like subtle border
    ...Platform.select({
      ios: {
        shadowColor: "#64748B",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: { elevation: 3, shadowColor: "#64748B" },
    }),
  },
  // Modern Input
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
  // Modern Button
  button: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
};
