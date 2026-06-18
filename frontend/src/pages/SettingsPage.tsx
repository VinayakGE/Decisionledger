import React, { useState } from "react";
import { api, ProviderStatus } from "../lib/api";
import { useData } from "../hooks/useData";
import { Card } from "../components/Card";
import { colors } from "../lib/styles";
import {
  CheckCircle,
  XCircle,
  Settings,
  KeyRound,
  ExternalLink,
  Info,
  Zap,
  FlaskConical,
} from "lucide-react";

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
      for (const [k, v] of Object.entries(keys)) {
        payload[k] = v.trim() || null;
      }
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

  const hasAnyKey = Object.values(keys).some((v) => v.trim().length > 0);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <Settings size={22} color={colors.primary} />
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Settings</h1>
      </div>
      <p style={{ color: colors.textSecondary, marginBottom: 32, fontSize: 14 }}>
        Configure API keys for entity extraction. Keys are kept in memory until the server restarts
        — for permanent storage, set them as environment variables in your deployment platform
        (Render dashboard, Docker .env, or local backend/.env).
      </p>

      {/* Extraction mode banner */}
      {data && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "14px 16px",
            borderRadius: 10,
            marginBottom: 24,
            background: data.llm_enabled ? `${colors.success}15` : `${colors.warning}15`,
            border: `1px solid ${data.llm_enabled ? colors.success : colors.warning}44`,
          }}
        >
          {data.llm_enabled ? (
            <Zap size={16} color={colors.success} style={{ flexShrink: 0, marginTop: 2 }} />
          ) : (
            <FlaskConical
              size={16}
              color={colors.warning}
              style={{ flexShrink: 0, marginTop: 2 }}
            />
          )}
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: data.llm_enabled ? colors.success : colors.warning,
                marginBottom: 3,
              }}
            >
              {data.llm_enabled
                ? "Production mode — LLM extraction active"
                : "Dev mode — heuristic only (no API tokens spent)"}
            </div>
            <div style={{ fontSize: 12, color: colors.textSecondary }}>
              {data.llm_enabled
                ? "Uploads will use the full AI provider chain (Anthropic → Gemini → Cerebras → Groq → Heuristic)."
                : "Uploads skip all LLM providers and use local heuristics. AI extraction runs automatically once the app is published."}
            </div>
          </div>
        </div>
      )}

      {/* Provider status */}
      <Card style={{ marginBottom: 24 }}>
        <div
          style={{ fontSize: 13, fontWeight: 600, color: colors.textSecondary, marginBottom: 14 }}
        >
          PROVIDER STATUS
        </div>
        {loading && <p style={{ color: colors.muted, fontSize: 13 }}>Loading…</p>}
        {error && <p style={{ color: colors.danger, fontSize: 13 }}>{error}</p>}
        {data && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.providers.map((p: ProviderStatus) => (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {p.configured ? (
                  <CheckCircle size={16} color={colors.success} />
                ) : (
                  <XCircle size={16} color={colors.muted} />
                )}
                <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{p.label}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: p.configured ? `${colors.success}22` : `${colors.muted}22`,
                    color: p.configured ? colors.success : colors.muted,
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
                marginTop: 4,
                paddingTop: 10,
                borderTop: `1px solid ${colors.border}`,
              }}
            >
              <CheckCircle size={16} color={colors.success} />
              <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>Heuristic (local)</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: `${colors.success}22`,
                  color: colors.success,
                }}
              >
                Always available
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Key input */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <KeyRound size={14} color={colors.primary} />
          <span style={{ fontSize: 13, fontWeight: 600, color: colors.textSecondary }}>
            SET API KEYS (SESSION)
          </span>
        </div>
        <p style={{ fontSize: 12, color: colors.muted, marginBottom: 16 }}>
          Leave a field blank to keep the existing key. Keys will be active until the server
          restarts.
        </p>
        {[
          {
            field: "anthropic_api_key",
            label: "Anthropic API Key",
            placeholder: "sk-ant-…",
            link: "https://console.anthropic.com/",
          },
          {
            field: "gemini_api_key",
            label: "Google Gemini API Key",
            placeholder: "AIza…",
            link: "https://aistudio.google.com/app/apikey",
          },
          {
            field: "cerebras_api_key",
            label: "Cerebras API Key",
            placeholder: "csk-…",
            link: "https://cloud.cerebras.ai/",
          },
          {
            field: "groq_api_key",
            label: "Groq API Key",
            placeholder: "gsk_…",
            link: "https://console.groq.com/keys",
          },
        ].map(({ field, label, placeholder, link }) => (
          <div key={field} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500 }}>{label}</label>
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                title="Get API key"
                style={{ color: colors.muted, display: "flex" }}
              >
                <ExternalLink size={11} />
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
                borderRadius: 8,
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
          <p style={{ color: colors.danger, fontSize: 13, marginBottom: 12 }}>{saveError}</p>
        )}
        {saveSuccess && (
          <p style={{ color: colors.success, fontSize: 13, marginBottom: 12 }}>
            Keys updated successfully.
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !hasAnyKey}
          style={{
            background: hasAnyKey && !saving ? colors.primary : colors.border,
            color: hasAnyKey && !saving ? "#fff" : colors.muted,
            border: "none",
            borderRadius: 8,
            padding: "10px 24px",
            cursor: hasAnyKey && !saving ? "pointer" : "not-allowed",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {saving ? "Saving…" : "Apply Keys"}
        </button>
      </Card>

      {/* Permanent storage instructions */}
      <Card>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <Info size={16} color={colors.warning} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: colors.warning }}>
              Permanent Storage via Environment Variables
            </div>
            <p style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 10 }}>
              For keys that survive server restarts, set them as environment variables in your
              deployment platform (Render dashboard, Docker .env, or local backend/.env):
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {["ANTHROPIC_API_KEY", "GEMINI_API_KEY", "CEREBRAS_API_KEY", "GROQ_API_KEY"].map(
                (name) => (
                  <code
                    key={name}
                    style={{
                      fontSize: 12,
                      background: colors.bg,
                      color: colors.primary,
                      padding: "3px 8px",
                      borderRadius: 4,
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
      </Card>
    </div>
  );
}
