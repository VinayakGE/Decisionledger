import React from "react";
import { colors } from "../lib/styles";

interface Props {
  message: string;
}

export function EmptyState({ message }: Props) {
  return (
    <div style={{ color: colors.muted, textAlign: "center", padding: "60px 0", fontSize: 14 }}>
      {message}
    </div>
  );
}
