import React from "react";
import { api } from "../lib/api";
import { useData } from "../hooks/useData";
import { Card } from "../components/Card";
import { ConfidenceBadge } from "../components/ConfidenceBadge";
import { EmptyState } from "../components/EmptyState";
import { PageShell, Spinner, ErrorMsg } from "./DecisionsPage";
import { colors } from "../lib/styles";
import { CheckSquare, Square } from "lucide-react";

export function ActionItemsPage() {
  const { data: items, loading, error } = useData(() => api.getActionItems());

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
  if (!items?.length)
    return (
      <PageShell title="Action Items">
        <EmptyState message="No action items detected yet." />
      </PageShell>
    );

  return (
    <PageShell title="Action Items" count={items.length}>
      {items.map((item) => (
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
