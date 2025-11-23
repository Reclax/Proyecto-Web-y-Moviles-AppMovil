export const palette = {
  primary: "#CF5C36",
  secondary: "#EFC88B",
  accent: "#7C7C7C",
  background: "#EEE5E9",
  surface: "#FFFFFF",
  muted: "#F5F5F5",
  text: "#1F1F1F",
  textMuted: "#6B6B6B",
  success: "#4CAF50",
  danger: "#FF6B6B",
};

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 28,
  full: 9999,
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const shadows = {
  sm: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  soft: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  card: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
};

export const gradients = {
  hero: ["#FFFFFF", "#FEECD7"],
  badge: ["#FFE5D1", "#FFFFFF"],
};

export const typography = {
  hero: 32,
  title: 20,
  subtitle: 16,
  body: 14,
  caption: 12,
};

export type ThemePalette = typeof palette;
