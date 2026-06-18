import React from "react";
import { confidence } from "../lib/styles";

interface Props {
  value: number;
}

export function ConfidenceBadge({ value }: Props) {
  const pct = Math.round(value * 100);
  const color = confidence(value);
  const tooltip =
    pct >= 80
      ? "High confidence — derived from clear evidence"
      : pct >= 50
        ? "Medium confidence — inferred from partial context"
        : "Low confidence — heuristic or uncertain extraction";
  return (
    <span
      title={tooltip}
      style={{
        display: "inline-block",
        padding: "1px 6px",
        borderRadius: 3,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.04em",
        color,
        background: `${color}14`,
        whiteSpace: "nowrap",
        cursor: "help",
      }}
    >
      {pct}%
    </span>
  );
}
