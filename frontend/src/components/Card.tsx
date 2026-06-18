import React from "react";
import { colors } from "../lib/styles";

interface Props {
  children: React.ReactNode;
  style?: React.CSSProperties;
  accent?: boolean;
}

export function Card({ children, style, accent }: Props) {
  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: "20px 24px",
        ...(accent && {
          borderLeft: `2px solid ${colors.primary}`,
          borderRadius: "0 8px 8px 0",
        }),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Rule() {
  return <div style={{ borderTop: `1px solid ${colors.border}`, margin: "28px 0" }} />;
}

export function Label({ children, bright }: { children: React.ReactNode; bright?: boolean }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        color: bright ? colors.textSecondary : colors.muted,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}
