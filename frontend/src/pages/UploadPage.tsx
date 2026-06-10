import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { api, UploadResponse } from "../lib/api";
import { colors } from "../lib/styles";
import { Card } from "../components/Card";

type State = "idle" | "uploading" | "done" | "error";

const ACCEPTED = ".json,.md,.txt";

export function UploadPage() {
  const [state, setState] = useState<State>("idle");
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [errMsg, setErrMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFile = async (file: File) => {
    setState("uploading");
    setResult(null);
    setErrMsg("");
    try {
      const res = await api.uploadFile(file);
      setResult(res);
      setState("done");
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : String(e));
      setState("error");
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Upload Conversations</h1>
      <p style={{ color: colors.textSecondary, marginBottom: 32, fontSize: 14 }}>
        Upload a ChatGPT export, Claude export, Markdown, or plain text file.
        All processing happens locally — no data leaves your machine.
      </p>

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
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={40} color={colors.primary} style={{ margin: "0 auto 16px" }} />
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            Drop your file here or click to browse
          </p>
          <p style={{ fontSize: 13, color: colors.textSecondary }}>
            Supports: ChatGPT JSON · Claude JSON · Markdown · Plain text
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

      {state === "uploading" && (
        <Card style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <Loader size={20} color={colors.primary} style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: 14 }}>Parsing and extracting entities…</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </Card>
      )}

      {state === "done" && result && (
        <Card style={{ marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <CheckCircle size={20} color={colors.success} />
            <span style={{ fontWeight: 600 }}>Upload complete</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              ["File", result.filename],
              ["Format", result.source_type.toUpperCase()],
              ["Conversations", result.conversation_count],
              ["Entities extracted", result.entities_extracted],
            ].map(([label, value]) => (
              <div key={String(label)} style={{ background: colors.bg, borderRadius: 8, padding: "12px 16px" }}>
                <div style={{ fontSize: 11, color: colors.muted, marginBottom: 4 }}>{label}</div>
                <div style={{ fontWeight: 600 }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button
              onClick={() => navigate("/decisions")}
              style={{
                background: colors.primary, color: "#fff", border: "none", borderRadius: 8,
                padding: "10px 20px", cursor: "pointer", fontWeight: 600, fontSize: 14,
              }}
            >
              View Decisions
            </button>
            <button
              onClick={() => navigate("/insights")}
              style={{
                background: "transparent", color: colors.primary, border: `1px solid ${colors.primary}`,
                borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontWeight: 600, fontSize: 14,
              }}
            >
              View Insights
            </button>
          </div>
        </Card>
      )}

      {state === "error" && (
        <Card style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <AlertCircle size={20} color={colors.danger} />
          <span style={{ fontSize: 14, color: colors.danger }}>{errMsg}</span>
        </Card>
      )}

      <Card style={{ marginTop: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: colors.textSecondary }}>
          HOW TO EXPORT YOUR CONVERSATIONS
        </div>
        {[
          ["ChatGPT", "Settings → Data Controls → Export Data → conversations.json"],
          ["Claude", "claude.ai → Settings → Export Data → JSON file"],
          ["Markdown", "Any .md file with **User:** / **Assistant:** speaker labels"],
          ["Plain text", "Any .txt file with notes, decisions, or meeting transcripts"],
        ].map(([src, hint]) => (
          <div key={String(src)} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
            <FileText size={14} color={colors.muted} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{src}: </span>
              <span style={{ fontSize: 13, color: colors.textSecondary }}>{hint}</span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
