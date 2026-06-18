import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useData } from "../hooks/useData";
import { Card } from "../components/Card";
import { ConfidenceBadge } from "../components/ConfidenceBadge";
import { FilterBar } from "../components/FilterBar";
import { PageShell, Spinner, ErrorMsg } from "./DecisionsPage";
import { colors } from "../lib/styles";
import { AlertTriangle, CheckCircle, RotateCcw } from "lucide-react";

export function ConstraintsPage() {
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [minConfidence, setMinConfidence] = useState(0);
  const [statuses, setStatuses] = useState<Record<number, "active" | "resolved">>({});

  const { data: sources } = useData(() => api.getSources());
  const {
    data: constraints,
    loading,
    error,
  } = useData(() => api.getConstraints(sourceId ?? undefined), [sourceId]);

  const visible = (constraints ?? []).filter((c) => (c.confidence ?? 0) >= minConfidence);

  const handleToggle = async (id: number, current: "active" | "resolved") => {
    const next = current === "active" ? "resolved" : "active";
    setStatuses((prev) => ({ ...prev, [id]: next }));
    try {
      await api.patchConstraintStatus(id, next);
    } catch {
      setStatuses((prev) => ({ ...prev, [id]: current }));
    }
  };

  if (loading)
    return (
      <PageShell title="Constraints">
        <Spinner />
      </PageShell>
    );
  if (error)
    return (
      <PageShell title="Constraints">
        <ErrorMsg msg={error} />
      </PageShell>
    );

  return (
    <PageShell title="Constraints" count={visible.length} unit="constraints">
      <FilterBar
        sources={sources ?? []}
        sourceId={sourceId}
        onSourceChange={setSourceId}
        minConfidence={minConfidence}
        onConfidenceChange={setMinConfidence}
      />

      {!visible.length && (
        <div
          style={{ textAlign: "center", padding: "48px 24px", color: colors.muted, fontSize: 14 }}
        >
          <p style={{ marginBottom: sourceId || minConfidence > 0 ? 0 : 12 }}>
            {sourceId || minConfidence > 0
              ? "No constraints match the current filters."
              : "No constraints detected yet."}
          </p>
          {!sourceId && minConfidence === 0 && (
            <Link to="/upload" style={{ color: colors.primary, fontSize: 13 }}>
              Upload a conversation to get started →
            </Link>
          )}
        </div>
      )}

      {visible.map((c) => {
        const effectiveStatus = statuses[c.id] ?? c.status ?? "active";
        const isResolved = effectiveStatus === "resolved";
        return (
          <Card
            key={c.id}
            style={{
              marginBottom: 10,
              display: "flex",
              gap: 14,
              alignItems: "flex-start",
              opacity: isResolved ? 0.55 : 1,
              transition: "opacity 0.2s",
            }}
          >
            <AlertTriangle
              size={16}
              color={isResolved ? colors.muted : colors.warning}
              style={{ flexShrink: 0, marginTop: 2 }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    textDecoration: isResolved ? "line-through" : "none",
                    color: isResolved ? colors.muted : colors.text,
                  }}
                >
                  {c.description}
                </span>
                <ConfidenceBadge value={c.confidence} />
              </div>
              {c.supporting_snippet && (
                <p
                  style={{
                    fontSize: 12,
                    color: colors.muted,
                    fontStyle: "italic",
                    margin: "0 0 4px",
                  }}
                >
                  "{c.supporting_snippet}"
                </p>
              )}
              {c.source_reference && (
                <p style={{ fontSize: 11, color: colors.muted, margin: "0 0 6px" }}>
                  From: {c.source_reference}
                </p>
              )}
              <button
                onClick={() => handleToggle(c.id, effectiveStatus)}
                style={{
                  background: "none",
                  border: `1px solid ${isResolved ? colors.border : colors.success}`,
                  color: isResolved ? colors.muted : colors.success,
                  borderRadius: 6,
                  padding: "3px 10px",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 500,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {isResolved ? (
                  <>
                    <RotateCcw size={11} /> Reopen
                  </>
                ) : (
                  <>
                    <CheckCircle size={11} /> Mark resolved
                  </>
                )}
              </button>
            </div>
          </Card>
        );
      })}
    </PageShell>
  );
}
