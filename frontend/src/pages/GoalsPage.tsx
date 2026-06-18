import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useData } from "../hooks/useData";
import { Card } from "../components/Card";
import { ConfidenceBadge } from "../components/ConfidenceBadge";
import { FilterBar } from "../components/FilterBar";
import { PageShell, Spinner, ErrorMsg } from "./DecisionsPage";
import { colors } from "../lib/styles";

const STATUS_COLOR: Record<string, string> = {
  open: colors.primary,
  achieved: colors.success,
  abandoned: colors.danger,
  unknown: colors.muted,
};

const STATUS_LABEL: Record<string, string> = {
  open: "In Progress",
  achieved: "Achieved",
  abandoned: "Abandoned",
  unknown: "Status Unknown",
};

export function GoalsPage() {
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [minConfidence, setMinConfidence] = useState(0.5);

  const { data: sources } = useData(() => api.getSources());
  const {
    data: goals,
    loading,
    error,
  } = useData(() => api.getGoals(sourceId ?? undefined), [sourceId]);

  const visible = (goals ?? []).filter((g) => (g.confidence ?? 0) >= minConfidence);

  if (loading)
    return (
      <PageShell title="Goals">
        <Spinner />
      </PageShell>
    );
  if (error)
    return (
      <PageShell title="Goals">
        <ErrorMsg msg={error} />
      </PageShell>
    );

  return (
    <PageShell title="Goals" count={visible.length} unit="goals">
      <FilterBar
        sources={sources ?? []}
        sourceId={sourceId}
        onSourceChange={setSourceId}
        minConfidence={minConfidence}
        onConfidenceChange={setMinConfidence}
      />

      {!visible.length && (
        <div
          style={{ textAlign: "center", padding: "48px 24px", color: colors.muted, fontSize: 14 }}
        >
          <p style={{ marginBottom: sourceId || minConfidence > 0 ? 0 : 12 }}>
            {sourceId || minConfidence > 0
              ? "No goals match the current filters."
              : "No goals found yet."}
          </p>
          {!sourceId && minConfidence === 0 && (
            <Link to="/" style={{ color: colors.primary, fontSize: 13 }}>
              Upload a conversation to get started →
            </Link>
          )}
        </div>
      )}

      {visible.map((g) => (
        <Card
          key={g.id}
          style={{ marginBottom: 10, display: "flex", gap: 12, alignItems: "flex-start" }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 6,
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 14 }}>{g.description}</span>
              <ConfidenceBadge value={g.confidence} />
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 999,
                  fontWeight: 600,
                  color: STATUS_COLOR[g.status] ?? colors.muted,
                  border: `1px solid ${STATUS_COLOR[g.status] ?? colors.muted}`,
                }}
              >
                {STATUS_LABEL[g.status] ?? g.status}
              </span>
              {g.frequency > 1 && (
                <span style={{ fontSize: 11, color: colors.warning }}>×{g.frequency} mentions</span>
              )}
            </div>
            {g.supporting_snippet && (
              <p style={{ fontSize: 12, color: colors.muted, fontStyle: "italic", margin: 0 }}>
                "{g.supporting_snippet}"
              </p>
            )}
          </div>
        </Card>
      ))}
    </PageShell>
  );
}
