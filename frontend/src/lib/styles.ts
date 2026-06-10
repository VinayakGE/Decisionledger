/** Shared design tokens as JS constants (avoids Tailwind dependency). */
export const colors = {
  bg: "#0f0f12",
  surface: "#1a1a24",
  surfaceHover: "#22222f",
  border: "#2d2d3d",
  primary: "#6366f1",
  primaryHover: "#4f52d9",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  muted: "#64748b",
  text: "#e2e8f0",
  textSecondary: "#94a3b8",
};

export const confidence = (score: number): string => {
  if (score >= 0.8) return colors.success;
  if (score >= 0.5) return colors.warning;
  return colors.danger;
};
