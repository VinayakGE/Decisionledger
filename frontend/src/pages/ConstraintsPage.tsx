import React from "react";
import { api } from "../lib/api";
import { useData } from "../hooks/useData";
import { Card } from "../components/Card";
import { ConfidenceBadge } from "../components/ConfidenceBadge";
import { EmptyState } from "../components/EmptyState";
import { PageShell, Spinner, ErrorMsg } from "./DecisionsPage";
import { colors } from "../lib/styles";
import { AlertTriangle } from "lucide-react";

export function ConstraintsPage() {
  const { data: constraints, loading, error } = useData(() => api.getConstraints());

  if (loading) return <PageShell title="Constraints"><Spinner /></PageShell>;
  if (error) return <PageShell title="Constraints"><ErrorMsg msg={error} /></PageShell>;
  if (!constraints?.length) return (
    <PageShell title="Constraints">
      <EmptyState message="No constraints detected yet." />
    </PageShell>
  );

  return (
    <PageShell title="Constraints" count={constraints.length}>
      {constraints.map((c) => (
        <Card key={c.id} style={{ marginBottom: 10, display: "flex", gap: 14, alignItems: "flex-start" }}>
          <AlertTriangle size={16} color={colors.warning} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
              <span style={{ fontSize: 14 }}>{c.description}</span>
              <ConfidenceBadge value={c.confidence} />
            </div>
            {c.supporting_snippet && (
              <p style={{ fontSize: 12, color: colors.muted, fontStyle: "italic", margin: 0 }}>
                "{c.supporting_snippet}"
              </p>
            )}
          </div>
        </Card>
      ))}
    </PageShell>
  );
}
