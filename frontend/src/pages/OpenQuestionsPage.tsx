import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useData } from "../hooks/useData";
import { Card } from "../components/Card";
import { ConfidenceBadge } from "../components/ConfidenceBadge";
import { FilterBar } from "../components/FilterBar";
import { PageShell, Spinner, ErrorMsg } from "./DecisionsPage";
import { colors } from "../lib/styles";
import { HelpCircle } from "lucide-react";

export function OpenQuestionsPage() {
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [minConfidence, setMinConfidence] = useState(0);

  const { data: sources } = useData(() => api.getSources());
  const {
    data: questions,
    loading,
    error,
  } = useData(() => api.getOpenQuestions(sourceId ?? undefined), [sourceId]);

  const visible = (questions ?? []).filter((q) => (q.confidence ?? 0) >= minConfidence);

  if (loading)
    return (
      <PageShell title="Open Questions">
        <Spinner />
      </PageShell>
    );
  if (error)
    return (
      <PageShell title="Open Questions">
        <ErrorMsg msg={error} />
      </PageShell>
    );

  return (
    <PageShell title="Open Questions" count={visible.length} unit="questions">
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
              ? "No questions match the current filters."
              : "No open questions detected yet."}
          </p>
          {!sourceId && minConfidence === 0 && (
            <Link to="/upload" style={{ color: colors.primary, fontSize: 13 }}>
              Capture a conversation to get started →
            </Link>
          )}
        </div>
      )}

      {visible.map((q) => (
        <Card
          key={q.id}
          style={{ marginBottom: 10, display: "flex", gap: 14, alignItems: "flex-start" }}
        >
          <HelpCircle size={16} color={colors.warning} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.8,
                color: colors.warning,
                marginBottom: 4,
                textTransform: "uppercase",
              }}
            >
              Unresolved Question
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{q.description}</span>
              <ConfidenceBadge value={q.confidence} />
            </div>
            {q.supporting_snippet && (
              <p
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  fontStyle: "italic",
                  margin: "0 0 4px",
                  paddingLeft: 10,
                  borderLeft: `2px solid ${colors.warning}`,
                }}
              >
                "{q.supporting_snippet}"
              </p>
            )}
            {q.source_reference && (
              <p style={{ fontSize: 11, color: colors.muted, margin: "4px 0 0" }}>
                From: {q.source_reference}
              </p>
            )}
          </div>
        </Card>
      ))}
    </PageShell>
  );
}
