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
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { data: settingsData } = useData(() => api.getSettings());
  const providers = settingsData?.providers ?? [];
  const anyConfigured = providers.some((p: ProviderStatus) => p.configured);

  const handleFile = async (file: File) => {
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
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Analyse Your Conversations</h1>
      <p style={{ color: colors.textSecondary, marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>
        Upload a ChatGPT or Claude export and get an instant intelligence report — decisions made,
        goals tracked, open questions, action items, and patterns in how you think.
      </p>

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
              : "No AI provider configured — extraction will use local heuristic fallback."}
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
            Drop your file here or click to browse
          </p>
          <p style={{ fontSize: 13, color: colors.textSecondary }}>
            ChatGPT/Claude ZIP · JSON · Markdown · Plain text
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
              Upload another
            </button>
          </div>
        </Card>
      )}

      {state.type === "error" && (
        <Card style={{ marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <AlertCircle size={20} color={colors.danger} />
            <span style={{ fontSize: 14, color: colors.danger, fontWeight: 600 }}>
              Upload failed
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
          How to export your conversations
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
            Your files are processed locally and sent only to your configured AI provider for
            extraction. Nothing is stored remotely.
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
