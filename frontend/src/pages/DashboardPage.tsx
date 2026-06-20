import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ProviderStatus } from "../lib/api";
import { useData } from "../hooks/useData";
import { colors } from "../lib/styles";
import { Card } from "../components/Card";

// ── Capture zone ──────────────────────────────────────────────────────────────

function UploadZone() {
  const [drag, setDrag] = useState(false);
  const [state, setState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { data: settings } = useData(() => api.getSettings());
  const providers = settings?.providers ?? [];
  const anyProvider = providers.some((p: ProviderStatus) => p.configured);

  const handle = async (file: File) => {
    setState("uploading");
    setError(null);
    try {
      const res = await api.uploadFile(file);
      if (res.extraction_status === "pending") {
        navigate(`/sources`);
      } else {
        navigate("/insights");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setState("error");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 48px",
      }}
    >
      {/* Hero text */}
      <div style={{ textAlign: "center", maxWidth: 560, marginBottom: 64 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: colors.primary,
            marginBottom: 24,
          }}
        >
          Decision Intelligence
        </div>
        <h1
          style={{
            fontSize: "clamp(32px, 5vw, 52px)",
            fontWeight: 300,
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
            color: colors.text,
            margin: "0 0 20px",
          }}
        >
          Your conversations contain more decisions than you remember making.
        </h1>
        <p style={{ fontSize: 15, color: colors.textSecondary, lineHeight: 1.7, margin: 0 }}>
          Capture ChatGPT conversations instantly with the browser extension, or fall back to file
          import when needed. We extract every decision, goal, open question, and pattern — then
          surface what you missed.
        </p>
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Import fallback file"
        onClick={() => ref.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && ref.current?.click()}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files[0];
          if (f) handle(f);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        style={{
          width: "100%",
          maxWidth: 480,
          border: `1px solid ${drag ? colors.primary : colors.borderStrong}`,
          borderRadius: 8,
          padding: "40px 32px",
          textAlign: "center",
          cursor: "pointer",
          background: drag ? `${colors.primary}08` : colors.surface,
          transition: "all 0.15s",
          outline: "none",
        }}
      >
        <input
          ref={ref}
          type="file"
          accept=".zip,.json,.md,.txt"
          style={{ display: "none" }}
          onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])}
        />

        {state === "uploading" ? (
          <div style={{ color: colors.textSecondary, fontSize: 14 }}>
            <Spinner /> Importing your conversations…
          </div>
        ) : state === "error" ? (
          <div>
            <div style={{ color: colors.danger, fontSize: 14, marginBottom: 12 }}>{error}</div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setState("idle");
              }}
              style={ghostBtn}
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: `1px solid ${colors.primary}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                color: colors.primary,
                fontSize: 18,
              }}
            >
              ↑
            </div>
            <div style={{ fontSize: 14, color: colors.text, fontWeight: 500, marginBottom: 6 }}>
              Import a file if you are not using the extension
            </div>
            <div style={{ fontSize: 12, color: colors.muted }}>
              Fallback import: ChatGPT ZIP · Claude ZIP · Markdown · Plain text
            </div>
          </>
        )}
      </div>

      {/* Provider status */}
      {settings && (
        <div
          style={{
            marginTop: 20,
            fontSize: 12,
            color: anyProvider ? colors.success : colors.muted,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: anyProvider ? colors.success : colors.muted,
              display: "inline-block",
            }}
          />
          {anyProvider
            ? `AI extraction via ${providers
                .filter((p: ProviderStatus) => p.configured)
                .map((p: ProviderStatus) => p.label)
                .join(", ")}`
            : "No AI provider configured — capture still works with local heuristics"}
          {!anyProvider && (
            <Link to="/settings" style={{ color: colors.primary, marginLeft: 4 }}>
              Add key →
            </Link>
          )}
        </div>
      )}

      {/* Capture / import instructions */}
      <div
        style={{
          marginTop: 48,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 1,
          maxWidth: 480,
          width: "100%",
          background: colors.border,
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        {[
          ["Browser extension", "Capture current ChatGPT thread instantly — no export step"],
          ["AI key", "Optional for better extraction quality; not required for capture"],
          ["ChatGPT export", "Fallback: Settings → Data Controls → Export Data"],
          ["Claude / files", "Fallback: ZIP, Markdown, and plain text imports"],
        ].map(([src, hint]) => (
          <div key={src} style={{ background: colors.surface, padding: "12px 16px" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: colors.textSecondary,
                marginBottom: 3,
              }}
            >
              {src}
            </div>
            <div style={{ fontSize: 11, color: colors.muted, lineHeight: 1.5 }}>{hint}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, fontSize: 11, color: colors.muted, textAlign: "center" }}>
        Capture happens without a new integration key. Analysis is sent only to your configured AI
        provider.
      </div>
    </div>
  );
}

// ── Intelligence briefing ─────────────────────────────────────────────────────

function Briefing() {
  const { data: insights, loading } = useData(() => api.getInsights());
  const { data: actions } = useData(() => api.getActionItems());

  if (loading || !insights) {
    return (
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}
      >
        <Spinner />
      </div>
    );
  }

  const topQuestion = insights.recurring_questions?.[0];
  const topPattern = insights.behavioral_notes?.[0];
  const pendingActions = (actions ?? [])
    .filter((a) => a.status === "pending" || a.status === "unknown")
    .slice(0, 4);
  const topReversal = insights.decision_reversals?.[0];

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "52px 40px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: 40,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: colors.muted,
              marginBottom: 8,
            }}
          >
            {new Date()
              .toLocaleDateString("en-US", { month: "long", year: "numeric" })
              .toUpperCase()}
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 300,
              letterSpacing: "-0.02em",
              color: colors.text,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Intelligence Briefing
          </h1>
        </div>
        <Link to="/" style={{ fontSize: 12, color: colors.muted, textDecoration: "none" }}>
          ↑ Upload more
        </Link>
      </div>

      <Rule />

      {/* Stat row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 1,
          background: colors.border,
          borderRadius: 8,
          overflow: "hidden",
          marginBottom: 40,
        }}
      >
        {[
          ["Decisions", insights.total_decisions, "/decisions"],
          ["Open Questions", insights.total_open_questions, "/questions"],
          ["Action Items", insights.total_action_items, "/actions"],
        ].map(([label, value, href]) => (
          <Link
            key={String(label)}
            to={String(href)}
            style={{
              textDecoration: "none",
              background: colors.surface,
              padding: "24px 28px",
              display: "block",
            }}
          >
            <div
              style={{
                fontSize: 42,
                fontWeight: 700,
                letterSpacing: "-0.04em",
                color: Number(value) > 0 ? colors.primary : colors.muted,
                lineHeight: 1,
                marginBottom: 8,
              }}
            >
              {value}
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: colors.muted,
              }}
            >
              {label}
            </div>
          </Link>
        ))}
      </div>

      {/* The question that won't close */}
      {topQuestion && (
        <>
          <Label bright>The question that won't close</Label>
          <div
            style={{
              borderLeft: `2px solid ${colors.primary}`,
              paddingLeft: 20,
              marginBottom: 40,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 400,
                fontStyle: "italic",
                color: colors.text,
                lineHeight: 1.5,
                marginBottom: 8,
              }}
            >
              "{topQuestion.representative}"
            </div>
            <div style={{ fontSize: 12, color: colors.muted }}>
              Surfaced {topQuestion.count} times across your conversations
            </div>
          </div>
        </>
      )}

      {/* Pattern detected */}
      {topPattern && (
        <>
          <Label bright>Pattern detected</Label>
          <div
            style={{
              background: `${colors.violet}08`,
              border: `1px solid ${colors.violet}22`,
              borderRadius: 8,
              padding: "20px 24px",
              marginBottom: 40,
            }}
          >
            <div style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 1.7 }}>
              {topPattern.pattern}
            </div>
            <div style={{ fontSize: 11, color: colors.muted, marginTop: 8 }}>
              Observed in{" "}
              {topPattern.source_filename.length > 36
                ? topPattern.source_filename.slice(0, 20) +
                  "…" +
                  topPattern.source_filename.slice(-12)
                : topPattern.source_filename}
            </div>
          </div>
        </>
      )}

      {/* Decision reversal */}
      {topReversal && (
        <>
          <Label bright>Potential reversal</Label>
          <div
            style={{
              background: `${colors.warning}08`,
              border: `1px solid ${colors.warning}22`,
              borderRadius: 8,
              padding: "20px 24px",
              marginBottom: 40,
            }}
          >
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: colors.muted,
                    marginBottom: 6,
                  }}
                >
                  Original
                </div>
                <div style={{ fontSize: 13, color: colors.textSecondary }}>
                  {topReversal.original.title}
                </div>
              </div>
              <div style={{ color: colors.muted, paddingTop: 16 }}>→</div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: colors.warning,
                    marginBottom: 6,
                  }}
                >
                  Reversed
                </div>
                <div style={{ fontSize: 13, color: colors.text }}>{topReversal.reversal.title}</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Pending actions */}
      {pendingActions.length > 0 && (
        <>
          <Label bright>Needs your attention</Label>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              background: colors.border,
              borderRadius: 8,
              overflow: "hidden",
              marginBottom: 40,
            }}
          >
            {pendingActions.map((a) => (
              <div
                key={a.id}
                style={{
                  background: colors.surface,
                  padding: "14px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: colors.warning,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 13, color: colors.textSecondary, flex: 1 }}>
                  {a.description}
                </span>
                {a.source_reference && (
                  <span style={{ fontSize: 11, color: colors.muted, flexShrink: 0 }}>
                    {a.source_reference.length > 24
                      ? a.source_reference.slice(0, 24) + "…"
                      : a.source_reference}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Blind spots */}
      {insights.blind_spots.length > 0 && (
        <>
          <Label bright>Discussed. Never acted on.</Label>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              background: colors.border,
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            {insights.blind_spots.slice(0, 3).map((b, i) => (
              <div
                key={i}
                style={{
                  background: colors.surface,
                  padding: "14px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <span style={{ fontSize: 13, color: colors.textSecondary, flex: 1 }}>
                  {b.topic}
                </span>
                <span style={{ fontSize: 11, color: colors.danger }}>
                  {b.discussion_count} discussions · {Math.round(b.ratio * 100)}% acted on
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <Rule />
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Link to="/insights" style={{ ...linkBtn, background: colors.primary, color: "#000" }}>
          Full insight report →
        </Link>
        <Link
          to="/decisions"
          style={{
            ...linkBtn,
            background: "transparent",
            color: colors.textSecondary,
            border: `1px solid ${colors.border}`,
          }}
        >
          Browse decisions
        </Link>
      </div>
    </div>
  );
}

// ── Exports ───────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { data: insights, loading } = useData(() => api.getInsights());

  const isEmpty =
    !loading &&
    insights &&
    !insights.total_decisions &&
    !insights.total_open_questions &&
    !insights.total_action_items;

  if (loading) {
    return (
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}
      >
        <Spinner />
      </div>
    );
  }

  return isEmpty ? <UploadZone /> : <Briefing />;
}

// ── Shared micro-components ───────────────────────────────────────────────────

function Spinner() {
  return (
    <div
      style={{
        width: 18,
        height: 18,
        border: `1.5px solid ${colors.border}`,
        borderTopColor: colors.primary,
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
        display: "inline-block",
      }}
    />
  );
}

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  border: `1px solid ${colors.border}`,
  color: colors.textSecondary,
  borderRadius: 6,
  padding: "8px 16px",
  cursor: "pointer",
  fontSize: 13,
};

const linkBtn: React.CSSProperties = {
  display: "inline-block",
  textDecoration: "none",
  borderRadius: 6,
  padding: "10px 20px",
  fontWeight: 600,
  fontSize: 13,
};

// re-export for use in other pages
export { Spinner };

// Local Label component (imported from Card but also used inline)
function Label({ children, bright }: { children: React.ReactNode; bright?: boolean }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        color: bright ? colors.textSecondary : colors.muted,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

function Rule() {
  return <div style={{ borderTop: `1px solid ${colors.border}`, margin: "32px 0" }} />;
}
