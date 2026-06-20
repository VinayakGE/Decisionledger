import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Loader,
  Clock,
  AlertTriangle,
  CheckSquare,
} from "lucide-react";
import { api, UploadResponse, Source, TERMINAL_STATUSES, ProviderStatus } from "../lib/api";
import { colors } from "../lib/styles";
import { Card } from "../components/Card";
import { useData } from "../hooks/useData";

type State =
  | { type: "idle" }
  | { type: "uploading" }
  | { type: "pending"; sourceId: number; filename: string }
  | { type: "done"; result: Source }
  | { type: "error"; msg: string };

const ACCEPTED = ".zip,.json,.md,.txt";
const POLL_INTERVAL_MS = 2000;

export function UploadPage() {
  const [state, setState] = useState<State>({ type: "idle" });
  const [dragOver, setDragOver] = useState(false);
  const [dupWarning, setDupWarning] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { data: settingsData } = useData(() => api.getSettings());
  const { data: existingSources } = useData(() => api.getSources());
  const providers = settingsData?.providers ?? [];
  const anyConfigured = providers.some((p: ProviderStatus) => p.configured);

  const handleFile = async (file: File) => {
    const dup = (existingSources ?? []).find((s) => s.filename === file.name);
    if (dup) {
      setDupWarning(file.name);
    } else {
      setDupWarning(null);
    }
    setState({ type: "uploading" });
    try {
      const res: UploadResponse = await api.uploadFile(file);
      if (res.extraction_status === "pending") {
        setState({ type: "pending", sourceId: res.source_id, filename: res.filename });
      } else {
        const source = await api.getSource(res.source_id);
        setState({ type: "done", result: source });
      }
    } catch (e: unknown) {
      setState({ type: "error", msg: e instanceof Error ? e.message : String(e) });
    }
  };

  useEffect(() => {
    if (state.type !== "pending") return;
    const { sourceId } = state;
    const interval = setInterval(async () => {
      try {
        const source = await api.getSource(sourceId);
        if (TERMINAL_STATUSES.has(source.extraction_status ?? "")) {
          clearInterval(interval);
          setState({ type: "done", result: source });
        }
      } catch {
        // network blip — keep polling
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [state.type === "pending" ? state.sourceId : null]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const result = state.type === "done" ? state.result : null;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        Capture Decisions Instantly
      </h1>
      <p style={{ color: colors.textSecondary, marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>
        Capture ChatGPT conversations with the browser extension or upload files as a fallback. The
        engine turns raw conversation history into a decision ledger with decisions, goals, open
        questions, action items, and reasoning patterns.
      </p>

      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, letterSpacing: 0.3 }}>
          Instant capture (recommended)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: colors.bg, borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>1. Load extension</div>
            <div style={{ fontSize: 12, color: colors.muted, lineHeight: 1.5 }}>
              Load the unpacked browser extension from the repository&apos;s{" "}
              <code>browser-extension/</code> folder.
            </div>
          </div>
          <div style={{ background: colors.bg, borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              2. Capture current chat
            </div>
            <div style={{ fontSize: 12, color: colors.muted, lineHeight: 1.5 }}>
              Open a ChatGPT conversation, click <strong>Capture Current Chat</strong>, and the app
              will ingest it without any export step.
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            color: colors.textSecondary,
            borderTop: `1px solid ${colors.border}`,
            paddingTop: 12,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <span>
            <strong>Capture source:</strong> no extra API key required
          </span>
          <span>
            <strong>Analysis quality:</strong> your existing AI provider key is optional but
            recommended
          </span>
        </div>
      </Card>

      {/* Provider banner */}
      {settingsData && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 8,
            marginBottom: 20,
            background: anyConfigured ? `${colors.success}12` : `${colors.warning}12`,
            border: `1px solid ${anyConfigured ? colors.success : colors.warning}44`,
            fontSize: 13,
          }}
        >
          {anyConfigured ? (
            <CheckSquare size={15} color={colors.success} />
          ) : (
            <AlertTriangle size={15} color={colors.warning} />
          )}
          <span style={{ color: anyConfigured ? colors.success : colors.warning, fontWeight: 500 }}>
            {anyConfigured
              ? `Extraction via: ${providers
                  .filter((p: ProviderStatus) => p.configured)
                  .map((p: ProviderStatus) => p.label)
                  .join(", ")}`
              : "No AI provider configured — capture still works, but analysis will use local heuristic fallback."}
          </span>
          {!anyConfigured && (
            <Link
              to="/settings"
              style={{
                color: colors.primary,
                fontSize: 12,
                marginLeft: "auto",
                whiteSpace: "nowrap",
              }}
            >
              Add API key →
            </Link>
          )}
        </div>
      )}

      <Card
        style={{
          border: `2px dashed ${dragOver ? colors.primary : colors.border}`,
          background: dragOver ? `${colors.primary}0a` : colors.surface,
          cursor: "pointer",
          textAlign: "center",
          padding: "48px 24px",
          transition: "all 0.2s",
        }}
      >
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload file — drop here or click to browse"
          onDrop={onDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            inputRef.current?.click();
          }}
        >
          <Upload size={40} color={colors.primary} style={{ margin: "0 auto 16px" }} />
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            Upload a file only if you are not using the extension
          </p>
          <p style={{ fontSize: 13, color: colors.textSecondary }}>
            Fallback import: ChatGPT/Claude ZIP · JSON · Markdown · Plain text
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            style={{ display: "none" }}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      </Card>

      {dupWarning && state.type === "done" && (
        <Card
          style={{
            marginTop: 16,
            background: `${colors.warning}12`,
            border: `1px solid ${colors.warning}44`,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "12px 16px",
          }}
        >
          <AlertTriangle size={15} color={colors.warning} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 13, color: colors.warning }}>
            <strong>{dupWarning}</strong> was already uploaded. A new copy has been added — you can
            delete the old one from{" "}
            <Link to="/sources" style={{ color: colors.warning, textDecoration: "underline" }}>
              Sources
            </Link>
            .
          </span>
        </Card>
      )}

      {state.type === "uploading" && (
        <Card style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <Loader
            size={20}
            color={colors.primary}
            style={{ animation: "spin 1s linear infinite" }}
          />
          <span style={{ fontSize: 14 }}>Uploading and parsing…</span>
        </Card>
      )}

      {state.type === "pending" && (
        <Card style={{ marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <Clock
              size={20}
              color={colors.primary}
              style={{ animation: "spin 2s linear infinite" }}
            />
            <span style={{ fontWeight: 600 }}>Extracting entities…</span>
          </div>
          <p style={{ fontSize: 13, color: colors.textSecondary, margin: 0 }}>
            Analysing <strong>{state.filename}</strong> with AI. This usually takes 10–60 seconds
            depending on file size.
          </p>
        </Card>
      )}

      {state.type === "done" && result && (
        <Card style={{ marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <CheckCircle size={20} color={colors.success} />
            <span style={{ fontWeight: 600 }}>Extraction complete</span>
            {result.extraction_status === "heuristic_fallback" && (
              <StatusBadge color={colors.warning} bg={`${colors.warning}1a`}>
                Heuristic fallback
              </StatusBadge>
            )}
            {result.extraction_status === "completed_with_fallback" && (
              <StatusBadge color={colors.success} bg={`${colors.success}1a`}>
                Completed with fallback
              </StatusBadge>
            )}
            {result.extraction_status === "partial" && (
              <StatusBadge color={colors.warning} bg={`${colors.warning}1a`}>
                Partial
              </StatusBadge>
            )}
            {result.extraction_status === "failed" && (
              <StatusBadge color={colors.danger} bg={`${colors.danger}1a`}>
                Extraction failed
              </StatusBadge>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {(
              [
                ["File", result.filename],
                ["Format", result.source_type.toUpperCase()],
                ["Conversations", result.conversation_count],
                ["Entities extracted", result.entities_extracted ?? 0],
                ["Provider", result.provider_used ?? "—"],
                [
                  "Avg confidence",
                  result.extraction_confidence_avg != null
                    ? `${(result.extraction_confidence_avg * 100).toFixed(0)}%`
                    : "—",
                ],
                [
                  "Duration",
                  result.extraction_duration_ms != null
                    ? `${(result.extraction_duration_ms / 1000).toFixed(1)}s`
                    : "—",
                ],
              ] as [string, string | number][]
            ).map(([label, value]) => (
              <div
                key={String(label)}
                style={{ background: colors.bg, borderRadius: 8, padding: "12px 16px" }}
              >
                <div style={{ fontSize: 11, color: colors.muted, marginBottom: 4 }}>{label}</div>
                <div style={{ fontWeight: 600 }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/insights")}
              style={{
                background: colors.primary,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              View Insight Report →
            </button>
            <button
              onClick={() => navigate("/decisions")}
              style={{
                background: "transparent",
                color: colors.primary,
                border: `1px solid ${colors.primary}`,
                borderRadius: 8,
                padding: "10px 20px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Browse Decisions
            </button>
            <button
              onClick={() => setState({ type: "idle" })}
              style={{
                background: "transparent",
                color: colors.textSecondary,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                padding: "10px 20px",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Import another file
            </button>
          </div>
        </Card>
      )}

      {state.type === "error" && (
        <Card style={{ marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <AlertCircle size={20} color={colors.danger} />
            <span style={{ fontSize: 14, color: colors.danger, fontWeight: 600 }}>
              Import failed
            </span>
          </div>
          <p style={{ fontSize: 13, color: colors.textSecondary, margin: "0 0 12px" }}>
            {state.msg}
          </p>
          <button
            onClick={() => setState({ type: "idle" })}
            style={{
              background: "transparent",
              color: colors.textSecondary,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Try again
          </button>
        </Card>
      )}

      <Card style={{ marginTop: 32 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            marginBottom: 14,
            color: colors.text,
            letterSpacing: 0.3,
          }}
        >
          File import fallback
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            ["ChatGPT export", "Settings → Data Controls → Export Data → upload .zip"],
            ["Claude export", "claude.ai → Settings → Export Data → upload .zip"],
            ["Markdown", ".md file with **User:** / **Assistant:** labels"],
            ["Plain text", ".txt notes, decisions, or meeting transcripts"],
          ].map(([src, hint]) => (
            <div
              key={String(src)}
              style={{ background: colors.bg, borderRadius: 8, padding: "10px 12px" }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>{src}</div>
              <div style={{ fontSize: 12, color: colors.muted, lineHeight: 1.4 }}>{hint}</div>
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: colors.muted,
            borderTop: `1px solid ${colors.border}`,
            paddingTop: 12,
          }}
        >
          <span>🔒</span>
          <span>
            Browser capture needs no extra integration key. Files stay local and are sent only to
            your configured AI provider for extraction. Nothing is stored remotely.
          </span>
        </div>
      </Card>
    </div>
  );
}

function StatusBadge({
  color,
  bg,
  children,
}: {
  color: string;
  bg: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        fontSize: 11,
        background: bg,
        color,
        borderRadius: 4,
        padding: "2px 8px",
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}
