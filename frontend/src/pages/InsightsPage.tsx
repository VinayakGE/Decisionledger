import React from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useData } from "../hooks/useData";
import { Card } from "../components/Card";
import { PageShell, Spinner, ErrorMsg } from "./DecisionsPage";
import { colors } from "../lib/styles";
import { ConfidenceBadge } from "../components/ConfidenceBadge";

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
    <div style={{ padding: "48px 40px", maxWidth: 820 }}>
      {/* Header */}
      <div
        style={{
          marginBottom: 40,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: colors.muted,
              marginBottom: 8,
            }}
          >
            Decision Intelligence
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 300,
              letterSpacing: "-0.02em",
              color: colors.text,
              margin: 0,
            }}
          >
            Insight Report
          </h1>
        </div>
        <button
          onClick={reload}
          style={{
            background: "transparent",
            border: `1px solid ${colors.borderStrong}`,
            color: colors.muted,
            borderRadius: 6,
            padding: "7px 14px",
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Refresh
        </button>
      </div>

      {isEmpty ? (
        <div style={{ textAlign: "center", padding: "80px 24px", color: colors.muted }}>
          <div style={{ fontSize: 48, marginBottom: 24, opacity: 0.2 }}>◎</div>
          <p
            style={{ fontSize: 16, fontWeight: 300, color: colors.textSecondary, marginBottom: 8 }}
          >
            No signal yet.
          </p>
          <p
            style={{
              fontSize: 13,
              marginBottom: 28,
              color: colors.muted,
              maxWidth: 320,
              margin: "0 auto 28px",
            }}
          >
            Capture a conversation or import a file and the engine will surface patterns, reversals,
            and blind spots.
          </p>
          <Link
            to="/upload"
            style={{
              display: "inline-block",
              background: colors.primary,
              color: "#000",
              borderRadius: 6,
              padding: "10px 24px",
              fontWeight: 700,
              fontSize: 12,
              textDecoration: "none",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Capture conversations →
          </Link>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 1,
              marginBottom: 48,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            {(
              [
                ["Decisions", data.total_decisions, "/decisions"],
                ["Open Questions", data.total_open_questions, "/questions"],
                ["Action Items", data.total_action_items, "/actions"],
              ] as [string, number, string][]
            ).map(([label, value, href]) => (
              <Link key={label} to={href} style={{ textDecoration: "none" }}>
                <div
                  style={{
                    background: colors.surface,
                    padding: "24px 20px",
                    cursor: "pointer",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLDivElement).style.background = colors.surfaceHover)
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLDivElement).style.background = colors.surface)
                  }
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: colors.muted,
                      marginBottom: 10,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{ fontSize: 42, fontWeight: 300, color: colors.primary, lineHeight: 1 }}
                  >
                    {value}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: colors.muted,
                      marginTop: 8,
                      letterSpacing: "0.06em",
                    }}
                  >
                    VIEW ALL →
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Behavioral Patterns */}
          {(data.behavioral_notes ?? []).length > 0 && (
            <Section label="Pattern" title="Decision-Making Patterns" accent={colors.violet}>
              <p style={{ fontSize: 13, color: colors.muted, marginBottom: 16, lineHeight: 1.6 }}>
                How you make decisions — observed by AI across your conversations.
              </p>
              {(data.behavioral_notes ?? []).map((note, i) => (
                <Card
                  key={i}
                  style={{
                    marginBottom: 8,
                    borderLeft: `2px solid ${colors.violet}`,
                    borderRadius: "0 8px 8px 0",
                  }}
                >
                  <p
                    style={{
                      fontSize: 14,
                      margin: "0 0 6px",
                      lineHeight: 1.5,
                      fontWeight: 300,
                      color: colors.text,
                    }}
                  >
                    {note.pattern}
                  </p>
                  <span style={{ fontSize: 11, color: colors.muted }}>
                    {note.source_filename.length > 40
                      ? note.source_filename.slice(0, 20) + "…" + note.source_filename.slice(-15)
                      : note.source_filename}
                  </span>
                </Card>
              ))}
            </Section>
          )}

          {/* Recurring Questions */}
          {data.recurring_questions.length > 0 && (
            <Section label="Unresolved" title="Questions That Won't Close" accent={colors.warning}>
              <p style={{ fontSize: 13, color: colors.muted, marginBottom: 16, lineHeight: 1.6 }}>
                These questions reappear across conversations — suggesting unresolved tension.
              </p>
              {data.recurring_questions.map((g, i) => (
                <Card key={i} style={{ marginBottom: 8 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: g.occurrences.length > 1 ? 10 : 0,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontWeight: 500, fontSize: 14, flex: 1 }}>
                      {g.representative}
                    </span>
                    <span
                      style={{
                        background: `${colors.warning}18`,
                        color: colors.warning,
                        borderRadius: 4,
                        padding: "2px 8px",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                      }}
                    >
                      ×{g.count} asked
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
            <Section label="Candidate" title="Potential Reversals" accent={colors.danger}>
              <p style={{ fontSize: 13, color: colors.muted, marginBottom: 16, lineHeight: 1.6 }}>
                Decisions that appear to contradict earlier ones. Verify before acting — these are
                candidates, not confirmed.
              </p>
              {data.decision_reversals.map((rev, i) => (
                <Card key={i} style={{ marginBottom: 8 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto 1fr",
                      gap: 12,
                      alignItems: "start",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          color: colors.muted,
                          marginBottom: 6,
                        }}
                      >
                        ORIGINAL
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{rev.original.title}</div>
                      {rev.original.source_reference && (
                        <div style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>
                          {rev.original.source_reference}
                        </div>
                      )}
                    </div>
                    <div style={{ color: colors.muted, paddingTop: 20, fontSize: 16 }}>→</div>
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          color: colors.danger,
                          marginBottom: 6,
                        }}
                      >
                        REVERSED BY
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{rev.reversal.title}</div>
                      {rev.reversal.source_reference && (
                        <div style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>
                          {rev.reversal.source_reference}
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: colors.muted,
                      marginTop: 12,
                      paddingTop: 10,
                      borderTop: `1px solid ${colors.border}`,
                    }}
                  >
                    {Math.round(rev.similarity * 100)}% similarity — candidate only
                  </div>
                </Card>
              ))}
            </Section>
          )}

          {/* Top Goals */}
          {data.top_goals.length > 0 && (
            <Section label="Goals" title="Most Recurring Goals" accent={colors.success}>
              <p style={{ fontSize: 13, color: colors.muted, marginBottom: 16, lineHeight: 1.6 }}>
                Goals ranked by frequency across your conversations.
              </p>
              {data.top_goals.map((g, i) => (
                <Card
                  key={g.id}
                  style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 14 }}
                >
                  <span
                    style={{
                      fontSize: 24,
                      fontWeight: 300,
                      color: colors.muted,
                      width: 28,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13 }}>{g.description}</span>
                    {g.source_reference && (
                      <div style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                        {g.source_reference}
                      </div>
                    )}
                  </div>
                  <ConfidenceBadge value={g.confidence} />
                  {g.frequency > 1 && (
                    <span style={{ fontSize: 11, color: colors.warning, fontWeight: 600 }}>
                      ×{g.frequency}
                    </span>
                  )}
                </Card>
              ))}
            </Section>
          )}

          {/* Blind Spots */}
          {data.blind_spots.length > 0 && (
            <Section label="Blind spot" title="Discussed. Never Acted On." accent={colors.danger}>
              <p style={{ fontSize: 13, color: colors.muted, marginBottom: 16, lineHeight: 1.6 }}>
                Topics discussed repeatedly with little follow-through. Low action-to-discussion
                ratio.
              </p>
              {data.blind_spots.map((b, i) => (
                <Card key={i} style={{ marginBottom: 8 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      marginBottom: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{b.topic}</span>
                    <div style={{ display: "flex", gap: 12, fontSize: 11, color: colors.muted }}>
                      <span>{b.discussion_count} discussions</span>
                      <span>{b.action_count} actions</span>
                      <span style={{ color: colors.danger, fontWeight: 600 }}>
                        {Math.round(b.ratio * 100)}% acted on
                      </span>
                    </div>
                  </div>
                  <div style={{ background: colors.border, borderRadius: 2, height: 2 }}>
                    <div
                      style={{
                        width: `${Math.round(b.ratio * 100)}%`,
                        height: 2,
                        background: colors.danger,
                        borderRadius: 2,
                        minWidth: b.ratio > 0 ? 4 : 0,
                      }}
                    />
                  </div>
                </Card>
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({
  label,
  title,
  accent,
  children,
}: {
  label: string;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 44 }}>
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: accent,
            marginBottom: 4,
          }}
        >
          {label}
        </div>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 300,
            letterSpacing: "-0.01em",
            margin: 0,
            color: colors.text,
          }}
        >
          {title}
        </h2>
      </div>
      {children}
      <div style={{ borderTop: `1px solid ${colors.border}`, marginTop: 20 }} />
    </div>
  );
}
