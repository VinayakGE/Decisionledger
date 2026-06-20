import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useData } from "../hooks/useData";
import { Card } from "../components/Card";
import { ConfidenceBadge } from "../components/ConfidenceBadge";
import { FilterBar } from "../components/FilterBar";
import { PageShell, Spinner, ErrorMsg } from "./DecisionsPage";
import { colors } from "../lib/styles";
import { CheckSquare, Square, XCircle } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  done: "Done",
  pending: "Pending",
  cancelled: "Cancelled",
  unknown: "Open",
};

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
    <PageShell title="Action Items" count={visible.length} unit="items">
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
            <Link to="/upload" style={{ color: colors.primary, fontSize: 13 }}>
              Capture a conversation to get started →
            </Link>
          )}
        </div>
      )}

      {visible.map((item) => {
        const statusColor =
          item.status === "done"
            ? colors.success
            : item.status === "cancelled"
              ? colors.danger
              : colors.muted;
        return (
          <Card
            key={item.id}
            style={{ marginBottom: 10, display: "flex", gap: 14, alignItems: "flex-start" }}
          >
            {item.status === "done" ? (
              <CheckSquare
                size={16}
                color={colors.success}
                style={{ flexShrink: 0, marginTop: 2 }}
              />
            ) : item.status === "cancelled" ? (
              <XCircle size={16} color={colors.danger} style={{ flexShrink: 0, marginTop: 2 }} />
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
                    color: statusColor,
                    border: `1px solid ${statusColor}`,
                    fontWeight: 500,
                  }}
                >
                  {STATUS_LABEL[item.status] ?? item.status}
                </span>
              </div>
              {item.supporting_snippet && (
                <p style={{ fontSize: 12, color: colors.muted, fontStyle: "italic", margin: 0 }}>
                  "{item.supporting_snippet}"
                </p>
              )}
              {item.source_reference && (
                <p style={{ fontSize: 11, color: colors.muted, margin: "4px 0 0" }}>
                  From: {item.source_reference}
                </p>
              )}
            </div>
          </Card>
        );
      })}
    </PageShell>
  );
}
