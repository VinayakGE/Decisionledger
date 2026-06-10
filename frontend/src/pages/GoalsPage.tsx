import React from "react";
import { api } from "../lib/api";
import { useData } from "../hooks/useData";
import { Card } from "../components/Card";
import { ConfidenceBadge } from "../components/ConfidenceBadge";
import { EmptyState } from "../components/EmptyState";
import { PageShell, Spinner, ErrorMsg } from "./DecisionsPage";
import { colors } from "../lib/styles";

const STATUS_COLOR: Record<string, string> = {
  open: colors.primary,
  achieved: colors.success,
  abandoned: colors.danger,
  unknown: colors.muted,
};

export function GoalsPage() {
  const { data: goals, loading, error } = useData(() => api.getGoals());

  if (loading) return <PageShell title="Goals"><Spinner /></PageShell>;
  if (error) return <PageShell title="Goals"><ErrorMsg msg={error} /></PageShell>;
  if (!goals?.length) return (
    <PageShell title="Goals">
      <EmptyState message="No goals found yet." />
    </PageShell>
  );

  return (
    <PageShell title="Goals" count={goals.length}>
      {goals.map((g) => (
        <Card key={g.id} style={{ marginBottom: 10, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{g.description}</span>
              <ConfidenceBadge value={g.confidence} />
              <span style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 999,
                color: STATUS_COLOR[g.status] ?? colors.muted,
                border: `1px solid ${STATUS_COLOR[g.status] ?? colors.muted}`,
              }}>
                {g.status}
              </span>
              {g.frequency > 1 && (
                <span style={{ fontSize: 11, color: colors.warning }}>
                  ×{g.frequency} mentions
                </span>
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
