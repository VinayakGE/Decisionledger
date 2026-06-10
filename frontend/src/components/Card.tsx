import React from "react";
import { colors } from "../lib/styles";

interface Props {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function Card({ children, style }: Props) {
  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        padding: "20px 24px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
