import React, { useState } from "react";
import { api, Decision } from "../lib/api";
import { useData } from "../hooks/useData";
import { Card } from "../components/Card";
import { ConfidenceBadge } from "../components/ConfidenceBadge";
import { EmptyState } from "../components/EmptyState";
import { colors } from "../lib/styles";
import { ChevronDown, ChevronRight } from "lucide-react";

export function DecisionsPage() {
  const { data: decisions, loading, error } = useData(() => api.getDecisions());
  const [expanded, setExpanded] = useState<number | null>(null);

  if (loading) return <PageShell title="Decisions"><Spinner /></PageShell>;
  if (error) return <PageShell title="Decisions"><ErrorMsg msg={error} /></PageShell>;
  if (!decisions?.length) return (
    <PageShell title="Decisions">
      <EmptyState message="No decisions found. Upload a conversation to get started." />
    </PageShell>
  );

  return (
    <PageShell title="Decisions" count={decisions.length}>
      {decisions.map((d) => (
        <Card key={d.id} style={{ marginBottom: 12 }}>
          <div
            style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}
            onClick={() => setExpanded(expanded === d.id ? null : d.id)}
          >
            <div style={{ marginTop: 2, color: colors.muted }}>
              {expanded === d.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600 }}>{d.title}</span>
                <ConfidenceBadge value={d.confidence} />
                {d.source_reference && (
                  <span style={{ fontSize: 11, color: colors.muted }}>
                    from: {d.source_reference}
                  </span>
                )}
              </div>
              {d.description && (
                <p style={{ fontSize: 13, color: colors.textSecondary, marginTop: 6, marginBottom: 0 }}>
                  {d.description}
                </p>
              )}
            </div>
          </div>

          {expanded === d.id && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${colors.border}` }}>
              {d.supporting_snippet && (
                <Snippet text={d.supporting_snippet} />
              )}
              {d.reasons.length > 0 && (
                <Section title="Reasons">
                  {d.reasons.map((r) => (
                    <li key={r.id} style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>
                      {r.description}
                      <ConfidenceBadge value={r.confidence} />
                    </li>
                  ))}
                </Section>
              )}
              {d.evidence.length > 0 && (
                <Section title="Evidence">
                  {d.evidence.map((ev) => (
                    <li key={ev.id} style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>
                      {ev.description}
                    </li>
                  ))}
                </Section>
              )}
            </div>
          )}
        </Card>
      ))}
    </PageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: colors.muted, marginBottom: 6 }}>{title.toUpperCase()}</div>
      <ul style={{ margin: 0, paddingLeft: 16 }}>{children}</ul>
    </div>
  );
}

function Snippet({ text }: { text: string }) {
  return (
    <blockquote style={{
      borderLeft: `3px solid ${colors.primary}`,
      margin: "0 0 12px",
      padding: "8px 12px",
      fontSize: 12,
      color: colors.textSecondary,
      fontStyle: "italic",
      background: colors.bg,
      borderRadius: "0 6px 6px 0",
    }}>
      "{text}"
    </blockquote>
  );
}

export function PageShell({
  title, count, children,
}: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div style={{ padding: "40px 32px", maxWidth: 820 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        {title}
        {count !== undefined && (
          <span style={{ fontSize: 14, fontWeight: 400, color: colors.muted, marginLeft: 10 }}>
            {count} items
          </span>
        )}
      </h1>
      <div style={{ marginTop: 24 }}>{children}</div>
    </div>
  );
}

export function Spinner() {
  return (
    <div style={{ color: colors.muted, fontSize: 14 }}>Loading…</div>
  );
}

export function ErrorMsg({ msg }: { msg: string }) {
  return <div style={{ color: colors.danger, fontSize: 14 }}>{msg}</div>;
}
