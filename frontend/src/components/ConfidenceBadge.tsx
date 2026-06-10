import React from "react";
import { confidence } from "../lib/styles";

interface Props {
  value: number;
}

export function ConfidenceBadge({ value }: Props) {
  const pct = Math.round(value * 100);
  const color = confidence(value);
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        color,
        border: `1px solid ${color}`,
        whiteSpace: "nowrap",
      }}
    >
      {pct}% conf
    </span>
  );
}
