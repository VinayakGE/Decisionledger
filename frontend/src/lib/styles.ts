/** Design system — Decisionledger */

export const colors = {
  // Backgrounds
  bg: "#06060A",
  surface: "#0D0D16",
  surfaceHover: "#12121E",
  surfaceElevated: "#161624",

  // Borders
  border: "#1A1A2E",
  borderStrong: "#26263E",

  // Typography
  text: "#EDEAF8",
  textSecondary: "#8B88AA",
  muted: "#4A4868",

  // Signature accent — amber gold
  primary: "#E8A020",
  primaryHover: "#F0B030",
  primaryDim: "#1C1400",

  // Semantic
  success: "#34D399",
  danger: "#F87171",
  warning: "#FB923C",

  // Insight elements
  violet: "#A78BFA",
};

export const type = {
  label: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.15em",
    textTransform: "uppercase" as const,
    color: colors.muted,
  },
  labelBright: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.15em",
    textTransform: "uppercase" as const,
    color: colors.textSecondary,
  },
  stat: {
    fontSize: 52,
    fontWeight: 700,
    letterSpacing: "-0.04em",
    lineHeight: 1,
    color: colors.primary,
  },
  quote: {
    fontSize: 15,
    fontStyle: "italic" as const,
    lineHeight: 1.7,
    color: colors.textSecondary,
  },
};

export const confidence = (score: number): string => {
  if (score >= 0.75) return colors.success;
  if (score >= 0.5) return colors.warning;
  return colors.danger;
};
