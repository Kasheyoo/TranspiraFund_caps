export const COLORS = {
  // Modern Enterprise Palette
  primary: '#2563EB',     // Strong Blue
  primaryDark: '#1E40AF', // Deep Blue
  secondary: '#60A5FA',   // Light Blue Accents
  accent: '#F59E0B',      // Warning/Attention

  // Backgrounds
  background: '#F3F4F6',  // Light Gray Page BG
  surface: '#FFFFFF',     // White Cards
  inputBg: '#F9FAFB',     // Very light gray for inputs

  // Text
  textDark: '#111827',    // Near Black (Easier on eyes)
  textGrey: '#6B7280',    // Secondary Text
  textLight: '#9CA3AF',   // Placeholders
  white: '#FFFFFF',

  // Status Colors
  success: '#10B981',
  error: '#EF4444',
  inputBorder: '#E5E7EB',
};

export const STYLES = {
  // Soft, diffuse modern shadow
  shadow: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 5, // Android
  },
  // Standard Card Style
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
  }
};