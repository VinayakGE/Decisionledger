import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Source, TERMINAL_STATUSES } from "../lib/api";
import { useData } from "../hooks/useData";
import { Card } from "../components/Card";
import { colors } from "../lib/styles";
import { PageShell, Spinner, ErrorMsg } from "./DecisionsPage";
import { RefreshCw, Trash2 } from "lucide-react";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_COLOR: Record<string, string> = {
  completed: colors.success,
  heuristic_fallback: colors.warning,
  completed_with_fallback: colors.success,
  partial: colors.warning,
  failed: colors.danger,
  pending: colors.muted,
};

const STATUS_LABEL: Record<string, string> = {
  completed: "Completed",
  heuristic_fallback: "Heuristic fallback",
  completed_with_fallback: "Completed",
  partial: "Partial",
  failed: "Failed",
  pending: "Processing…",
};

const SOURCE_TYPE_LABEL: Record<string, string> = {
  chatgpt: "CHATGPT",
  claude: "CLAUDE",
  markdown: "MARKDOWN",
  text: "TEXT",
  chatgpt_capture: "CHATGPT CAPTURE",
};

export function SourcesPage() {
  const { data: sources, loading, error, reload } = useData(() => api.getSources());
  const [deleting, setDeleting] = useState<number | null>(null);
  const [reanalyzing, setReanalyzing] = useState<number | null>(null);
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  useEffect(() => {
    const hasPending = (sources ?? []).some(
      (s) => !TERMINAL_STATUSES.has(s.extraction_status ?? "")
    );
    if (!hasPending) return;
    const id = setInterval(reload, 3000);
    return () => clearInterval(id);
  }, [sources, reload]);

  const handleDelete = async (source: Source) => {
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
      setConfirmDelete(null);
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
      <PageShell title="Sources">
        <Spinner />
      </PageShell>
    );
  if (error)
    return (
      <PageShell title="Sources">
        <ErrorMsg msg={error} />
      </PageShell>
    );

  const visible = (sources ?? []).filter((s) => !removed.has(s.id));

  if (!visible.length)
    return (
      <PageShell title="Sources">
        <div style={{ textAlign: "center", padding: "80px 24px", color: colors.muted }}>
          <div style={{ fontSize: 48, opacity: 0.15, marginBottom: 20 }}>◎</div>
          <p
            style={{ fontSize: 15, fontWeight: 300, color: colors.textSecondary, marginBottom: 6 }}
          >
            No uploads yet.
          </p>
          <p style={{ fontSize: 13, color: colors.muted, marginBottom: 28 }}>
            Every file you upload becomes a source — your decisions get extracted from it.
          </p>
          <Link
            to="/upload"
            style={{
              display: "inline-block",
              background: colors.primary,
              color: "#000",
              borderRadius: 6,
              padding: "10px 24px",
              fontWeight: 700,
              fontSize: 12,
              textDecoration: "none",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Capture a conversation →
          </Link>
        </div>
      </PageShell>
    );

  return (
    <PageShell title="Sources" count={visible.length} unit="files">
      {actionError && (
        <p style={{ color: colors.danger, marginBottom: 16, fontSize: 13 }}>{actionError}</p>
      )}

      {visible.map((s) => {
        const status = s.extraction_status ?? "unknown";
        const isPending = !TERMINAL_STATUSES.has(status);
        const isBusy = deleting === s.id || reanalyzing === s.id || isPending;
        const lowQuality =
          s.provider_used === "heuristic" ||
          (s.extraction_confidence_avg != null && s.extraction_confidence_avg < 0.55);
        const statusColor = STATUS_COLOR[status] ?? colors.muted;

        return (
          <Card key={s.id} style={{ marginBottom: 12 }}>
            {/* Low quality warning */}
            {lowQuality && !isPending && (
              <div
                style={{
                  fontSize: 12,
                  color: colors.warning,
                  background: `${colors.warning}0A`,
                  border: `1px solid ${colors.warning}33`,
                  borderRadius: 5,
                  padding: "7px 12px",
                  marginBottom: 14,
                  lineHeight: 1.5,
                }}
              >
                Low confidence extraction — AI provider may not have been available.{" "}
                <strong style={{ fontWeight: 600 }}>Re-analyze</strong> to improve quality.
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Filename row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontWeight: 500, fontSize: 14 }} title={s.filename}>
                    {s.filename.length > 44
                      ? s.filename.slice(0, 22) + "…" + s.filename.slice(-16)
                      : s.filename}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: colors.muted,
                      background: colors.border,
                      padding: "2px 6px",
                      borderRadius: 3,
                    }}
                  >
                    {s.source_type}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: statusColor,
                      background: `${statusColor}14`,
                      padding: "2px 7px",
                      borderRadius: 3,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    {isPending && (
                      <span
                        style={{
                          display: "inline-block",
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          border: `1.5px solid ${colors.muted}`,
                          borderTopColor: "transparent",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                    )}
                    {STATUS_LABEL[status] ?? status}
                  </span>
                </div>

                {/* Meta row */}
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                  {[
                    ["Uploaded", formatDate(s.uploaded_at)],
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
                      <span style={{ color: colors.muted }}>{label} </span>
                      {val}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => handleReanalyze(s)}
                  disabled={isBusy}
                  title="Re-analyze with AI"
                  style={{
                    background: "none",
                    border: `1px solid ${isBusy ? colors.border : colors.borderStrong}`,
                    color: isBusy ? colors.muted : colors.textSecondary,
                    borderRadius: 5,
                    padding: "5px 12px",
                    cursor: isBusy ? "not-allowed" : "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    opacity: isBusy ? 0.45 : 1,
                    transition: "border-color 0.12s, color 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isBusy) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = colors.primary;
                      (e.currentTarget as HTMLButtonElement).style.color = colors.primary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = isBusy
                      ? colors.border
                      : colors.borderStrong;
                    (e.currentTarget as HTMLButtonElement).style.color = isBusy
                      ? colors.muted
                      : colors.textSecondary;
                  }}
                >
                  <RefreshCw
                    size={12}
                    style={reanalyzing === s.id ? { animation: "spin 0.8s linear infinite" } : {}}
                  />
                  Re-analyze
                </button>
                <button
                  onClick={() => setConfirmDelete(s.id)}
                  disabled={isBusy}
                  title="Delete source and all entities"
                  style={{
                    background: "none",
                    border: `1px solid ${isBusy ? colors.border : colors.borderStrong}`,
                    color: isBusy ? colors.muted : colors.textSecondary,
                    borderRadius: 5,
                    padding: "5px 8px",
                    cursor: isBusy ? "not-allowed" : "pointer",
                    opacity: isBusy ? 0.45 : 1,
                    display: "flex",
                    alignItems: "center",
                    transition: "border-color 0.12s, color 0.12s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isBusy) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = colors.danger;
                      (e.currentTarget as HTMLButtonElement).style.color = colors.danger;
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = isBusy
                      ? colors.border
                      : colors.borderStrong;
                    (e.currentTarget as HTMLButtonElement).style.color = isBusy
                      ? colors.muted
                      : colors.textSecondary;
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Delete confirmation */}
            {confirmDelete === s.id && (
              <div
                style={{
                  marginTop: 12,
                  background: `${colors.danger}0A`,
                  border: `1px solid ${colors.danger}33`,
                  borderRadius: 5,
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span style={{ flex: 1, fontSize: 13, color: colors.danger }}>
                  Delete this source and all its extracted data?
                </span>
                <button
                  onClick={() => handleDelete(s)}
                  disabled={deleting === s.id}
                  style={{
                    background: colors.danger,
                    color: "#fff",
                    border: "none",
                    borderRadius: 5,
                    padding: "5px 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    cursor: deleting === s.id ? "not-allowed" : "pointer",
                    opacity: deleting === s.id ? 0.6 : 1,
                  }}
                >
                  {deleting === s.id ? "Deleting…" : "Delete"}
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: colors.muted,
                    fontSize: 12,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </Card>
        );
      })}
    </PageShell>
  );
}
