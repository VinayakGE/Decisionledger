import React, { useState } from "react";
import { api, Source } from "../lib/api";
import { useData } from "../hooks/useData";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { colors } from "../lib/styles";
import { Trash2 } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  completed: colors.success,
  heuristic_fallback: "#92400E",
  completed_with_fallback: colors.success,
  partial: "#92400E",
  failed: colors.danger,
  pending: colors.muted,
};

const STATUS_BG: Record<string, string> = {
  completed: "#D1FAE5",
  heuristic_fallback: "#FEF3C7",
  completed_with_fallback: "#D1FAE5",
  partial: "#FEF3C7",
  failed: "#FEE2E2",
  pending: "#F3F4F6",
};

export function SourcesPage() {
  const { data: sources, loading, error, reload } = useData(() => api.getSources());
  const [deleting, setDeleting] = useState<number | null>(null);
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async (source: Source) => {
    if (!window.confirm(`Delete "${source.filename}" and all its extracted entities?`))
      return;
    setDeleting(source.id);
    setDeleteError(null);
    try {
      await api.deleteSource(source.id);
      setRemoved((prev) => new Set(prev).add(source.id));
      reload();
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleting(null);
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
      {deleteError && (
        <p style={{ color: colors.danger, marginBottom: 12, fontSize: 13 }}>{deleteError}</p>
      )}
      {visible.map((s) => {
        const status = s.extraction_status ?? "unknown";
        return (
          <Card key={s.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{s.filename}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 4,
                      padding: "2px 8px",
                      background: STATUS_BG[status] ?? "#F3F4F6",
                      color: STATUS_COLOR[status] ?? colors.muted,
                    }}
                  >
                    {status}
                  </span>
                  <span style={{ fontSize: 11, color: colors.muted }}>
                    {s.source_type.toUpperCase()}
                  </span>
                </div>
                <div style={{ marginTop: 6, display: "flex", gap: 20, flexWrap: "wrap" }}>
                  {
                    [
                      ["Conversations", s.conversation_count ?? "—"],
                      ["Entities", s.entities_extracted ?? "—"],
                      ["Provider", s.provider_used ?? "—"],
                      [
                        "Confidence",
                        s.extraction_confidence_avg != null
                          ? `${(s.extraction_confidence_avg * 100).toFixed(0)}%`
                          : "—",
                      ],
                    ] as const
                  }.map(([label, val]) => (
                    <span
                      key={String(label)}
                      style={{ fontSize: 12, color: colors.textSecondary }}
                    >
                      <span style={{ color: colors.muted }}>{label}: </span>
                      {val}
                    </span>
                  ))
                }
                </div>
              </div>
              <button
                onClick={() => handleDelete(s)}
                disabled={deleting === s.id}
                title="Delete source and all entities"
                style={{
                  background: "none",
                  border: "none",
                  cursor: deleting === s.id ? "wait" : "pointer",
                  color: deleting === s.id ? colors.muted : colors.danger,
                  padding: 6,
                  borderRadius: 6,
                  flexShrink: 0,
                  opacity: deleting === s.id ? 0.5 : 1,
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
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px" }}>
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
    <>
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
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </>
  );
}
