import React from "react";
import { api } from "../lib/api";
import { useData } from "../hooks/useData";
import { Card } from "../components/Card";
import { ConfidenceBadge } from "../components/ConfidenceBadge";
import { EmptyState } from "../components/EmptyState";
import { PageShell, Spinner, ErrorMsg } from "./DecisionsPage";
import { colors } from "../lib/styles";
import { HelpCircle } from "lucide-react";

export function OpenQuestionsPage() {
  const { data: questions, loading, error } = useData(() => api.getOpenQuestions());

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
  if (!questions?.length)
    return (
      <PageShell title="Open Questions">
        <EmptyState message="No open questions detected yet." />
      </PageShell>
    );

  return (
    <PageShell title="Open Questions" count={questions.length}>
      {questions.map((q) => (
        <Card
          key={q.id}
          style={{ marginBottom: 10, display: "flex", gap: 14, alignItems: "flex-start" }}
        >
          <HelpCircle size={16} color={colors.warning} style={{ flexShrink: 0, marginTop: 2 }} />
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
              <span style={{ fontSize: 14 }}>{q.description}</span>
              <ConfidenceBadge value={q.confidence} />
            </div>
            {q.supporting_snippet && (
              <p style={{ fontSize: 12, color: colors.muted, fontStyle: "italic", margin: 0 }}>
                "{q.supporting_snippet}"
              </p>
            )}
            {q.source_reference && (
              <p style={{ fontSize: 11, color: colors.muted, margin: "4px 0 0" }}>
                Source: {q.source_reference}
              </p>
            )}
          </div>
        </Card>
      ))}
    </PageShell>
  );
}
