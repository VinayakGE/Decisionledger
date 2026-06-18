import React, { useEffect, useState } from "react";
import { api, Source, TERMINAL_STATUSES } from "../lib/api";
import { useData } from "../hooks/useData";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { colors } from "../lib/styles";
import { Trash2, RefreshCw } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  completed: colors.success,
  heuristic_fallback: colors.warning,
  completed_with_fallback: colors.success,
  partial: colors.warning,
  failed: colors.danger,
  pending: colors.muted,
};

const DEFAULT_STATUS_BG = `${colors.muted}1a`;

const STATUS_BG: Record<string, string> = {
  completed: `${colors.success}1a`,
  heuristic_fallback: `${colors.warning}1a`,
  completed_with_fallback: `${colors.success}1a`,
  partial: `${colors.warning}1a`,
  failed: `${colors.danger}1a`,
  pending: DEFAULT_STATUS_BG,
};

const STATUS_LABEL: Record<string, string> = {
  completed: "Completed",
  heuristic_fallback: "Heuristic fallback",
  completed_with_fallback: "Completed (with fallback)",
  partial: "Partial",
  failed: "Failed",
  pending: "Pending",
};

export function SourcesPage() {
  const { data: sources, loading, error, reload } = useData(() => api.getSources());
  const [deleting, setDeleting] = useState<number | null>(null);
  const [reanalyzing, setReanalyzing] = useState<number | null>(null);
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);

  // Poll every 3 s while any source is pending
  useEffect(() => {
    const hasPending = (sources ?? []).some(
      (s) => !TERMINAL_STATUSES.has(s.extraction_status ?? "")
    );
    if (!hasPending) return;
    const id = setInterval(reload, 3000);
    return () => clearInterval(id);
  }, [sources, reload]);

  const handleDelete = async (source: Source) => {
    if (!window.confirm(`Delete "${source.filename}" and all its extracted entities?`)) return;
    setDeleting(source.id);
    setActionError(null);
    try {
      await api.deleteSource(source.id);
      setRemoved((prev) => new Set(prev).add(source.id));
      reload();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleting(null);
    }
  };

  const handleReanalyze = async (source: Source) => {
    setReanalyzing(source.id);
    setActionError(null);
    try {
      await api.reanalyzeSource(source.id);
      reload();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setReanalyzing(null);
    }
  };

  if (loading)
    return (
      <Shell>
        <Spinner />
      </Shell>
    );
  if (error)
    return (
      <Shell>
        <p style={{ color: colors.danger }}>{error}</p>
      </Shell>
    );

  const visible = (sources ?? []).filter((s) => !removed.has(s.id));
  if (!visible.length)
    return (
      <Shell>
        <EmptyState message="No uploads yet. Go to Upload to add a conversation file." />
      </Shell>
    );

  return (
    <Shell count={visible.length}>
      {actionError && (
        <p style={{ color: colors.danger, marginBottom: 12, fontSize: 13 }}>{actionError}</p>
      )}
      {visible.map((s) => {
        const status = s.extraction_status ?? "unknown";
        const isPending = !TERMINAL_STATUSES.has(status);
        const isBusy = deleting === s.id || reanalyzing === s.id || isPending;
        return (
          <Card key={s.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }} title={s.filename}>
                    {s.filename.length > 40
                      ? s.filename.slice(0, 20) + "…" + s.filename.slice(-15)
                      : s.filename}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 4,
                      padding: "2px 8px",
                      background: STATUS_BG[status] ?? DEFAULT_STATUS_BG,
                      color: STATUS_COLOR[status] ?? colors.muted,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {isPending && (
                      <span
                        style={{
                          display: "inline-block",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          border: `1.5px solid ${colors.muted}`,
                          borderTopColor: "transparent",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                    )}
                    {STATUS_LABEL[status] ?? status}
                  </span>
                  <span style={{ fontSize: 11, color: colors.muted }}>
                    {s.source_type.toUpperCase()}
                  </span>
                </div>
                <div style={{ marginTop: 6, display: "flex", gap: 20, flexWrap: "wrap" }}>
                  {[
                    ["Conversations", s.conversation_count ?? "—"],
                    ["Entities", s.entities_extracted ?? "—"],
                    ["Provider", s.provider_used ?? "—"],
                    [
                      "Confidence",
                      s.extraction_confidence_avg != null
                        ? `${(s.extraction_confidence_avg * 100).toFixed(0)}%`
                        : "—",
                    ],
                  ].map(([label, val]) => (
                    <span key={String(label)} style={{ fontSize: 12, color: colors.textSecondary }}>
                      <span style={{ color: colors.muted }}>{label}: </span>
                      {val}
                    </span>
                  ))}
                </div>
              </div>

              {/* Re-analyze button */}
              <button
                onClick={() => handleReanalyze(s)}
                disabled={isBusy}
                title={isPending ? "Extraction in progress…" : "Re-analyze with AI"}
                style={{
                  background: "none",
                  border: `1px solid ${isBusy ? colors.border : colors.primary}`,
                  cursor: isBusy ? "not-allowed" : "pointer",
                  color: isBusy ? colors.muted : colors.primary,
                  padding: "5px 10px",
                  borderRadius: 6,
                  flexShrink: 0,
                  opacity: isBusy ? 0.5 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                <RefreshCw
                  size={13}
                  style={reanalyzing === s.id ? { animation: "spin 0.8s linear infinite" } : {}}
                />
                Re-analyze
              </button>

              {/* Delete button */}
              <button
                onClick={() => handleDelete(s)}
                disabled={isBusy}
                title="Delete source and all entities"
                style={{
                  background: "none",
                  border: "none",
                  cursor: isBusy ? "not-allowed" : "pointer",
                  color: isBusy ? colors.muted : colors.danger,
                  padding: 6,
                  borderRadius: 6,
                  flexShrink: 0,
                  opacity: isBusy ? 0.5 : 1,
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </Card>
        );
      })}
    </Shell>
  );
}

function Shell({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Sources</h1>
        {count != null && (
          <span style={{ fontSize: 13, color: colors.muted }}>
            {count} file{count !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Spinner() {
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
