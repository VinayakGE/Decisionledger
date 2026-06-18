import React, { useState } from "react";
import { api, ProviderStatus } from "../lib/api";
import { useData } from "../hooks/useData";
import { Card } from "../components/Card";
import { colors } from "../lib/styles";
import { PageShell, Spinner, ErrorMsg } from "./DecisionsPage";

const PROVIDERS = [
  {
    field: "anthropic_api_key",
    label: "Anthropic",
    placeholder: "sk-ant-…",
    link: "https://console.anthropic.com/",
  },
  {
    field: "gemini_api_key",
    label: "Google Gemini",
    placeholder: "AIza…",
    link: "https://aistudio.google.com/app/apikey",
  },
  {
    field: "cerebras_api_key",
    label: "Cerebras",
    placeholder: "csk-…",
    link: "https://cloud.cerebras.ai/",
  },
  {
    field: "groq_api_key",
    label: "Groq",
    placeholder: "gsk_…",
    link: "https://console.groq.com/keys",
  },
];

export function SettingsPage() {
  const { data, loading, error, reload } = useData(() => api.getSettings());
  const [keys, setKeys] = useState<Record<string, string>>({
    anthropic_api_key: "",
    gemini_api_key: "",
    cerebras_api_key: "",
    groq_api_key: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const payload: Record<string, string | null> = {};
      for (const [k, v] of Object.entries(keys)) payload[k] = v.trim() || null;
      await api.updateSettings(payload as Parameters<typeof api.updateSettings>[0]);
      setSaveSuccess(true);
      setKeys({
        anthropic_api_key: "",
        gemini_api_key: "",
        cerebras_api_key: "",
        groq_api_key: "",
      });
      reload();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <PageShell title="Settings">
        <Spinner />
      </PageShell>
    );
  if (error)
    return (
      <PageShell title="Settings">
        <ErrorMsg msg={error} />
      </PageShell>
    );

  const hasAnyKey = Object.values(keys).some((v) => v.trim().length > 0);
  const activeProvider = data?.providers.find((p: ProviderStatus) => p.configured);

  return (
    <PageShell title="Settings">
      {/* Extraction mode */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: "14px 18px",
          borderRadius: 6,
          marginBottom: 32,
          background: data?.llm_enabled ? `${colors.success}0A` : `${colors.warning}0A`,
          border: `1px solid ${data?.llm_enabled ? colors.success : colors.warning}33`,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: data?.llm_enabled ? colors.success : colors.warning,
            flexShrink: 0,
            marginTop: 4,
          }}
        />
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: data?.llm_enabled ? colors.success : colors.warning,
              marginBottom: 3,
            }}
          >
            {data?.llm_enabled ? "Production — LLM extraction active" : "Dev mode — heuristic only"}
          </div>
          <div style={{ fontSize: 12, color: colors.textSecondary }}>
            {data?.llm_enabled
              ? `Active provider: ${activeProvider?.label ?? "unknown"} · Chain: Anthropic → Gemini → Cerebras → Groq → Heuristic`
              : "No API keys configured. Uploads use local heuristics — add a key below for full AI extraction."}
          </div>
        </div>
      </div>

      {/* Provider status */}
      <SepLabel>Provider Status</SepLabel>
      <Card style={{ marginBottom: 32, padding: "0 24px" }}>
        {data?.providers.map((p: ProviderStatus) => (
          <div
            key={p.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 0",
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: p.configured ? colors.success : colors.muted,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 13, flex: 1 }}>{p.label}</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: p.configured ? colors.success : colors.muted,
                background: p.configured ? `${colors.success}14` : `${colors.muted}14`,
                padding: "2px 7px",
                borderRadius: 3,
              }}
            >
              {p.configured ? "Configured" : "Not set"}
            </span>
          </div>
        ))}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 0",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: colors.success,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 13, flex: 1 }}>Heuristic (local)</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: colors.success,
              background: `${colors.success}14`,
              padding: "2px 7px",
              borderRadius: 3,
            }}
          >
            Always available
          </span>
        </div>
      </Card>

      {/* Permanent storage note */}
      <SepLabel>Permanent Storage</SepLabel>
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: "14px 16px",
          borderRadius: 6,
          background: `${colors.warning}0A`,
          border: `1px solid ${colors.warning}33`,
          marginBottom: 32,
        }}
      >
        <span style={{ fontSize: 13, color: colors.warning, flexShrink: 0, marginTop: 1 }}>⚠</span>
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: colors.warning,
              marginBottom: 6,
            }}
          >
            Keys reset on server restart
          </div>
          <div
            style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.6, marginBottom: 10 }}
          >
            For persistent keys, set environment variables in your deployment platform — Render
            dashboard, Docker .env, or local{" "}
            <code
              style={{
                fontSize: 11,
                background: colors.bg,
                color: colors.primary,
                padding: "1px 6px",
                borderRadius: 3,
                border: `1px solid ${colors.border}`,
                fontFamily: "monospace",
              }}
            >
              backend/.env
            </code>
            .
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {["ANTHROPIC_API_KEY", "GEMINI_API_KEY", "CEREBRAS_API_KEY", "GROQ_API_KEY"].map(
              (name) => (
                <code
                  key={name}
                  style={{
                    fontSize: 11,
                    background: colors.bg,
                    color: colors.primary,
                    padding: "3px 8px",
                    borderRadius: 3,
                    border: `1px solid ${colors.border}`,
                    fontFamily: "monospace",
                    display: "inline-block",
                    width: "fit-content",
                  }}
                >
                  {name}
                </code>
              )
            )}
          </div>
        </div>
      </div>

      {/* Key inputs */}
      <SepLabel>Set Keys — Session Only</SepLabel>
      <Card>
        {PROVIDERS.map(({ field, label, placeholder, link }) => (
          <div key={field} style={{ marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: colors.textSecondary,
                }}
              >
                {label}
              </span>
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 11, color: colors.muted, textDecoration: "none" }}
              >
                Get key ↗
              </a>
            </div>
            <input
              type="password"
              placeholder={placeholder}
              value={keys[field]}
              onChange={(e) => setKeys((prev) => ({ ...prev, [field]: e.target.value }))}
              style={{
                width: "100%",
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: 6,
                padding: "10px 14px",
                color: colors.text,
                fontSize: 13,
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>
        ))}

        {saveError && (
          <p style={{ color: colors.danger, fontSize: 12, marginBottom: 12 }}>{saveError}</p>
        )}
        {saveSuccess && (
          <p style={{ color: colors.success, fontSize: 12, marginBottom: 12 }}>
            Keys applied — active until server restarts.
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={handleSave}
            disabled={saving || !hasAnyKey}
            style={{
              background: hasAnyKey && !saving ? colors.primary : colors.border,
              color: hasAnyKey && !saving ? "#000" : colors.muted,
              border: "none",
              borderRadius: 6,
              padding: "10px 24px",
              cursor: hasAnyKey && !saving ? "pointer" : "not-allowed",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {saving ? "Applying…" : "Apply Keys"}
          </button>
          <span style={{ fontSize: 11, color: colors.muted }}>Active until server restarts</span>
        </div>
      </Card>
    </PageShell>
  );
}

function SepLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        color: colors.muted,
        display: "flex",
        alignItems: "center",
        gap: 12,
        margin: "0 0 16px",
      }}
    >
      {children}
      <div style={{ flex: 1, height: 1, background: colors.border }} />
    </div>
  );
}
