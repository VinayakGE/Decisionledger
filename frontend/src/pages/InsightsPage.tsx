import React from "react";
import { api } from "../lib/api";
import { useData } from "../hooks/useData";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { PageShell, Spinner, ErrorMsg } from "./DecisionsPage";
import { colors } from "../lib/styles";
import { ConfidenceBadge } from "../components/ConfidenceBadge";
import { RefreshCcw, Eye, RotateCcw, HelpCircle, Target, AlertOctagon } from "lucide-react";

export function InsightsPage() {
  const { data, loading, error, reload } = useData(() => api.getInsights());

  if (loading)
    return (
      <PageShell title="Insights">
        <Spinner />
      </PageShell>
    );
  if (error)
    return (
      <PageShell title="Insights">
        <ErrorMsg msg={error} />
      </PageShell>
    );
  if (!data) return null;

  const hasAnything =
    data.recurring_questions.length ||
    data.decision_reversals.length ||
    data.top_goals.length ||
    data.blind_spots.length;

  return (
    <div style={{ padding: "40px 32px", maxWidth: 900 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 32,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Insight Report</h1>
        <button
          onClick={reload}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "transparent",
            border: `1px solid ${colors.border}`,
            color: colors.textSecondary,
            borderRadius: 8,
            padding: "8px 14px",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          <RefreshCcw size={14} /> Refresh
        </button>
      </div>

      {/* Summary stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 32,
        }}
      >
        {[
          ["Total Decisions", data.total_decisions],
          ["Open Questions", data.total_open_questions],
          ["Action Items", data.total_action_items],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <div style={{ fontSize: 11, color: colors.muted, marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: colors.primary }}>{value}</div>
          </Card>
        ))}
      </div>

      {!hasAnything && (
        <EmptyState message="No insights generated yet. Upload conversations to begin analysis." />
      )}

      {/* Recurring Questions */}
      {data.recurring_questions.length > 0 && (
        <Section icon={<HelpCircle size={18} color={colors.warning} />} title="Recurring Questions">
          <p style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>
            These questions appear multiple times across your conversations, suggesting unresolved
            tension.
          </p>
          {data.recurring_questions.map((g, i) => (
            <Card key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{g.representative}</span>
                <span
                  style={{
                    background: `${colors.warning}22`,
                    color: colors.warning,
                    borderRadius: 999,
                    padding: "2px 8px",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {g.count}× asked
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {g.occurrences.slice(1).map((o, j) => (
                  <li key={j} style={{ fontSize: 12, color: colors.muted, marginBottom: 2 }}>
                    {o}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </Section>
      )}

      {/* Decision Reversals */}
      {data.decision_reversals.length > 0 && (
        <Section icon={<RotateCcw size={18} color={colors.danger} />} title="Decision Reversals">
          <p style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>
            These decisions appear to have been changed or reversed in later conversations.
          </p>
          {data.decision_reversals.map((rev, i) => (
            <Card key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: colors.muted, marginBottom: 4 }}>ORIGINAL</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{rev.original.title}</div>
                  {rev.original.description && (
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                      {rev.original.description}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", color: colors.muted }}>→</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: colors.danger, marginBottom: 4 }}>
                    REVERSED
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{rev.reversal.title}</div>
                  {rev.reversal.description && (
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                      {rev.reversal.description}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 11, color: colors.muted, marginTop: 8 }}>
                Similarity: {Math.round(rev.similarity * 100)}%
              </div>
            </Card>
          ))}
        </Section>
      )}

      {/* Top Goals */}
      {data.top_goals.length > 0 && (
        <Section icon={<Target size={18} color={colors.success} />} title="Top Goals by Frequency">
          <p style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>
            Goals ranked by how often they appear across your conversations.
          </p>
          {data.top_goals.map((g, i) => (
            <Card
              key={g.id}
              style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 14 }}
            >
              <span style={{ fontSize: 22, fontWeight: 700, color: colors.muted, width: 28 }}>
                {i + 1}
              </span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 14 }}>{g.description}</span>
              </div>
              <ConfidenceBadge value={g.confidence} />
              {g.frequency > 1 && (
                <span style={{ fontSize: 12, color: colors.warning }}>×{g.frequency}</span>
              )}
            </Card>
          ))}
        </Section>
      )}

      {/* Blind Spots */}
      {data.blind_spots.length > 0 && (
        <Section
          icon={<AlertOctagon size={18} color={colors.danger} />}
          title="Potential Blind Spots"
        >
          <p style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>
            Topics discussed frequently but rarely followed up with action. Low action-to-discussion
            ratio.
          </p>
          {data.blind_spots.map((b, i) => (
            <Card key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{b.topic}</span>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: colors.muted }}>
                  <span>{b.discussion_count} discussions</span>
                  <span>{b.action_count} actions</span>
                  <span style={{ color: colors.danger }}>
                    {Math.round(b.ratio * 100)}% acted on
                  </span>
                </div>
              </div>
              {/* progress bar */}
              <div style={{ marginTop: 8, background: colors.border, borderRadius: 4, height: 4 }}>
                <div
                  style={{
                    width: `${Math.round(b.ratio * 100)}%`,
                    height: 4,
                    background: colors.danger,
                    borderRadius: 4,
                    minWidth: b.ratio > 0 ? 4 : 0,
                  }}
                />
              </div>
            </Card>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        {icon}
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}
