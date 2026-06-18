import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api, Decision, Source } from "../lib/api";
import { useData } from "../hooks/useData";
import { Card } from "../components/Card";
import { ConfidenceBadge } from "../components/ConfidenceBadge";
import { FilterBar } from "../components/FilterBar";
import { colors } from "../lib/styles";
import { ChevronDown, ChevronRight } from "lucide-react";

export function DecisionsPage() {
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [minConfidence, setMinConfidence] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const { data: sources } = useData(() => api.getSources());
  const {
    data: decisions,
    loading,
    error,
  } = useData(() => api.getDecisions(sourceId ?? undefined), [sourceId]);

  const visible = (decisions ?? []).filter((d) => (d.confidence ?? 0) >= minConfidence);

  if (loading)
    return (
      <PageShell title="Decisions">
        <Spinner />
      </PageShell>
    );
  if (error)
    return (
      <PageShell title="Decisions">
        <ErrorMsg msg={error} />
      </PageShell>
    );

  return (
    <PageShell title="Decisions" count={visible.length} unit="decisions">
      <FilterBar
        sources={sources ?? []}
        sourceId={sourceId}
        onSourceChange={(id) => {
          setSourceId(id);
          setExpanded(null);
        }}
        minConfidence={minConfidence}
        onConfidenceChange={setMinConfidence}
      />

      {!visible.length && (
        <EmptyState
          message={
            sourceId || minConfidence > 0
              ? "No decisions match the current filters."
              : "No decisions yet."
          }
          showUploadLink={!sourceId && minConfidence === 0}
        />
      )}

      {visible.map((d) => (
        <Card
          key={d.id}
          style={{
            marginBottom: 12,
            transition: "border-color 0.15s",
            borderColor: hoveredCard === d.id ? colors.primary : undefined,
          }}
        >
          <div
            style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}
            onClick={() => setExpanded(expanded === d.id ? null : d.id)}
            onMouseEnter={() => setHoveredCard(d.id)}
            onMouseLeave={() => setHoveredCard(null)}
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
                <p
                  style={{
                    fontSize: 13,
                    color: colors.textSecondary,
                    marginTop: 6,
                    marginBottom: 0,
                  }}
                >
                  {d.description}
                </p>
              )}
              {(d.reasons.length > 0 || d.evidence.length > 0) && expanded !== d.id && (
                <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  {d.reasons.length > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        color: colors.primary,
                        background: `${colors.primary}18`,
                        borderRadius: 4,
                        padding: "2px 7px",
                      }}
                    >
                      {d.reasons.length} reason{d.reasons.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {d.evidence.length > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        color: colors.success,
                        background: `${colors.success}18`,
                        borderRadius: 4,
                        padding: "2px 7px",
                      }}
                    >
                      {d.evidence.length} evidence
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {expanded === d.id && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${colors.border}` }}>
              {d.supporting_snippet && <Snippet text={d.supporting_snippet} />}
              {d.reasons.length > 0 && (
                <Section title="Reasons">
                  {d.reasons.map((r) => (
                    <li
                      key={r.id}
                      style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}
                    >
                      {r.description} <ConfidenceBadge value={r.confidence} />
                    </li>
                  ))}
                </Section>
              )}
              {d.evidence.length > 0 && (
                <Section title="Evidence">
                  {d.evidence.map((ev) => (
                    <li
                      key={ev.id}
                      style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}
                    >
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
      <div style={{ fontSize: 11, fontWeight: 700, color: colors.muted, marginBottom: 6 }}>
        {title.toUpperCase()}
      </div>
      <ul style={{ margin: 0, paddingLeft: 16 }}>{children}</ul>
    </div>
  );
}

function Snippet({ text }: { text: string }) {
  return (
    <blockquote
      style={{
        borderLeft: `3px solid ${colors.primary}`,
        margin: "0 0 12px",
        padding: "8px 12px",
        fontSize: 12,
        color: colors.textSecondary,
        fontStyle: "italic",
        background: colors.bg,
        borderRadius: "0 6px 6px 0",
      }}
    >
      "{text}"
    </blockquote>
  );
}

function EmptyState({ message, showUploadLink }: { message: string; showUploadLink?: boolean }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "48px 24px",
        color: colors.muted,
        fontSize: 14,
      }}
    >
      <p style={{ marginBottom: showUploadLink ? 12 : 0 }}>{message}</p>
      {showUploadLink && (
        <Link to="/" style={{ color: colors.primary, fontSize: 13 }}>
          Upload a conversation to get started →
        </Link>
      )}
    </div>
  );
}

export function PageShell({
  title,
  count,
  unit,
  children,
}: {
  title: string;
  count?: number;
  unit?: string;
  children: React.ReactNode;
}) {
  const label = unit ?? "items";
  return (
    <div style={{ padding: "40px 32px", maxWidth: 820 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
        {title}
        {count !== undefined && (
          <span style={{ fontSize: 14, fontWeight: 400, color: colors.muted, marginLeft: 10 }}>
            {count} {count === 1 ? label.replace(/s$/, "") : label}
          </span>
        )}
      </h1>
      <div style={{ marginTop: 24 }}>{children}</div>
    </div>
  );
}

export function Spinner() {
  return (
    <div
      style={{
        width: 24,
        height: 24,
        border: `2px solid ${colors.border}`,
        borderTopColor: colors.primary,
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    />
  );
}

export function ErrorMsg({ msg }: { msg: string }) {
  return <div style={{ color: colors.danger, fontSize: 14 }}>{msg}</div>;
}
