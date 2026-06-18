import React from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useData } from "../hooks/useData";
import { Card } from "../components/Card";
import { PageShell, Spinner, ErrorMsg } from "./DecisionsPage";
import { colors } from "../lib/styles";
import { ConfidenceBadge } from "../components/ConfidenceBadge";
import { RefreshCcw, Eye, RotateCcw, HelpCircle, Target, AlertOctagon, Brain } from "lucide-react";

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

  const isEmpty =
    !data.total_decisions &&
    !data.total_open_questions &&
    !data.total_action_items &&
    !data.recurring_questions.length &&
    !data.decision_reversals.length &&
    !data.top_goals.length &&
    !data.blind_spots.length &&
    !(data.behavioral_notes ?? []).length;

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
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Insight Report</h1>
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
        {(
          [
            ["Total Decisions", data.total_decisions, "/decisions"],
            ["Open Questions", data.total_open_questions, "/open-questions"],
            ["Action Items", data.total_action_items, "/action-items"],
          ] as [string, number, string][]
        ).map(([label, value, href]) => (
          <Link key={label} to={href} style={{ textDecoration: "none" }}>
            <Card style={{ cursor: "pointer", transition: "border-color 0.15s" }}>
              <div style={{ fontSize: 11, color: colors.muted, marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: colors.primary }}>{value}</div>
              <div style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>View all →</div>
            </Card>
          </Link>
        ))}
      </div>

      {isEmpty && (
        <div
          style={{ textAlign: "center", padding: "48px 24px", color: colors.muted, fontSize: 14 }}
        >
          <Eye size={32} color={colors.border} style={{ margin: "0 auto 16px" }} />
          <p style={{ marginBottom: 12 }}>No insights generated yet.</p>
          <Link to="/" style={{ color: colors.primary, fontSize: 13 }}>
            Upload a conversation to begin analysis →
          </Link>
        </div>
      )}

      {/* Behavioral Patterns */}
      {(data.behavioral_notes ?? []).length > 0 && (
        <Section icon={<Brain size={18} color={colors.primary} />} title="Decision-Making Patterns">
          <p style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>
            How decisions are being made — patterns observed across your conversations by AI analysis.
          </p>
          {(data.behavioral_notes ?? []).map((note, i) => (
            <Card key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: colors.primary,
                    flexShrink: 0,
                    marginTop: 7,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, margin: "0 0 4px", lineHeight: 1.5 }}>{note.pattern}</p>
                  <span style={{ fontSize: 11, color: colors.muted }}>
                    from: {note.source_filename.length > 40
                      ? note.source_filename.slice(0, 20) + "…" + note.source_filename.slice(-15)
                      : note.source_filename}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </Section>
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
              {g.occurrences.length > 1 && (
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {g.occurrences.slice(1).map((o, j) => (
                    <li key={j} style={{ fontSize: 12, color: colors.muted, marginBottom: 2 }}>
                      {o}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </Section>
      )}

      {/* Decision Reversals */}
      {data.decision_reversals.length > 0 && (
        <Section icon={<RotateCcw size={18} color={colors.danger} />} title="Decision Reversals">
          <p style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>
            Potential reversals detected — these decisions appear to contradict earlier ones. Verify
            before acting.
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
                  {rev.original.source_reference && (
                    <div style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>
                      from: {rev.original.source_reference}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", color: colors.muted }}>→</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: colors.danger, marginBottom: 4 }}>
                    REVERSED BY
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{rev.reversal.title}</div>
                  {rev.reversal.description && (
                    <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                      {rev.reversal.description}
                    </div>
                  )}
                  {rev.reversal.source_reference && (
                    <div style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>
                      from: {rev.reversal.source_reference}
                    </div>
                  )}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: colors.muted,
                  marginTop: 10,
                  paddingTop: 8,
                  borderTop: `1px solid ${colors.border}`,
                }}
              >
                Similarity score: {Math.round(rev.similarity * 100)}% — candidate reversal, not
                confirmed
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
                {g.source_reference && (
                  <div style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                    from: {g.source_reference}
                  </div>
                )}
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
            Topics discussed frequently but with little follow-through on action. Low
            action-to-discussion ratio — worth a deliberate review.
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
