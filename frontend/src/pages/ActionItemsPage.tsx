import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useData } from "../hooks/useData";
import { Card } from "../components/Card";
import { ConfidenceBadge } from "../components/ConfidenceBadge";
import { FilterBar } from "../components/FilterBar";
import { PageShell, Spinner, ErrorMsg } from "./DecisionsPage";
import { colors } from "../lib/styles";
import { CheckSquare, Square } from "lucide-react";

export function ActionItemsPage() {
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [minConfidence, setMinConfidence] = useState(0);

  const { data: sources } = useData(() => api.getSources());
  const {
    data: items,
    loading,
    error,
  } = useData(() => api.getActionItems(sourceId ?? undefined), [sourceId]);

  const visible = (items ?? []).filter((i) => (i.confidence ?? 0) >= minConfidence);

  if (loading)
    return (
      <PageShell title="Action Items">
        <Spinner />
      </PageShell>
    );
  if (error)
    return (
      <PageShell title="Action Items">
        <ErrorMsg msg={error} />
      </PageShell>
    );

  return (
    <PageShell title="Action Items" count={visible.length}>
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
              ? "No action items match the current filters."
              : "No action items detected yet."}
          </p>
          {!sourceId && minConfidence === 0 && (
            <Link to="/" style={{ color: colors.primary, fontSize: 13 }}>
              Upload a conversation to get started →
            </Link>
          )}
        </div>
      )}

      {visible.map((item) => (
        <Card
          key={item.id}
          style={{ marginBottom: 10, display: "flex", gap: 14, alignItems: "flex-start" }}
        >
          {item.status === "done" ? (
            <CheckSquare size={16} color={colors.success} style={{ flexShrink: 0, marginTop: 2 }} />
          ) : (
            <Square size={16} color={colors.muted} style={{ flexShrink: 0, marginTop: 2 }} />
          )}
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 14 }}>{item.description}</span>
              <ConfidenceBadge value={item.confidence} />
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 999,
                  color: colors.muted,
                  border: `1px solid ${colors.border}`,
                }}
              >
                {item.status}
              </span>
            </div>
            {item.supporting_snippet && (
              <p style={{ fontSize: 12, color: colors.muted, fontStyle: "italic", margin: 0 }}>
                "{item.supporting_snippet}"
              </p>
            )}
          </div>
        </Card>
      ))}
    </PageShell>
  );
}
