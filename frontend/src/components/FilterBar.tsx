import React from "react";
import { Source } from "../lib/api";
import { colors } from "../lib/styles";

interface FilterBarProps {
  sources: Source[];
  sourceId: number | null;
  onSourceChange: (id: number | null) => void;
  minConfidence: number;
  onConfidenceChange: (v: number) => void;
  /** Set to false to hide the confidence slider (e.g. Goals page) */
  showConfidence?: boolean;
}

export function FilterBar({
  sources,
  sourceId,
  onSourceChange,
  minConfidence,
  onConfidenceChange,
  showConfidence = true,
}: FilterBarProps) {
  if (!sources.length) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        flexWrap: "wrap",
        marginBottom: 20,
        padding: "12px 16px",
        background: colors.surface,
        borderRadius: 10,
        border: `1px solid ${colors.border}`,
      }}
    >
      {/* Source picker */}
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
        <span style={{ color: colors.muted, whiteSpace: "nowrap" }}>Source</span>
        <select
          value={sourceId ?? ""}
          onChange={(e) => onSourceChange(e.target.value ? Number(e.target.value) : null)}
          style={{
            background: colors.bg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <option value="">All sources</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.filename}
            </option>
          ))}
        </select>
      </label>

      {/* Confidence slider */}
      {showConfidence && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          <span style={{ color: colors.muted, whiteSpace: "nowrap" }}>
            Min confidence:{" "}
            <strong style={{ color: colors.text }}>{Math.round(minConfidence * 100)}%</strong>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={minConfidence}
            onChange={(e) => onConfidenceChange(Number(e.target.value))}
            style={{ width: 120, accentColor: colors.primary, cursor: "pointer" }}
          />
        </label>
      )}
    </div>
  );
}
