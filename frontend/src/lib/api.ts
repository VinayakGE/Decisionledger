/**
 * Typed API client — all types are derived from the generated api-types.gen.ts.
 * Run `npm run generate:api` from the frontend directory to regenerate after
 * backend schema changes.
 */
import type { components } from "./api-types.gen";

const BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

// ── Re-export generated schema types under friendly names ─────────────────────

export type Source         = components["schemas"]["ConversationSourceOut"];
export type Decision       = components["schemas"]["DecisionOut"];
export type Reason         = components["schemas"]["ReasonOut"];
export type Evidence       = components["schemas"]["EvidenceOut"];
export type Goal           = components["schemas"]["GoalOut"];
export type Constraint     = components["schemas"]["ConstraintOut"];
export type OpenQuestion   = components["schemas"]["OpenQuestionOut"];
export type ActionItem     = components["schemas"]["ActionItemOut"];
export type InsightReport  = components["schemas"]["InsightReport"];
export type UploadResponse = components["schemas"]["UploadResponse"];
export type RecurringQuestionGroup = components["schemas"]["RecurringQuestionGroup"];
export type DecisionReversal       = components["schemas"]["DecisionReversal"];
export type BlindSpot              = components["schemas"]["BlindSpot"];

export interface FallbackStep {
  provider: string;
  status: string;
  error?: string;
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const r = await fetch(BASE + path);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

// ── API surface ───────────────────────────────────────────────────────────────

export const TERMINAL_STATUSES = new Set([
  "completed", "heuristic_fallback", "completed_with_fallback", "partial", "failed",
]);

export const api = {
  uploadFile: async (file: File): Promise<UploadResponse> => {
    const form = new FormData();
    form.append("file", file);
    const r = await fetch(`${BASE}/upload`, { method: "POST", body: form });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: r.statusText }));
      throw new Error(err.detail || r.statusText);
    }
    return r.json();
  },
  getSources:       () => get<Source[]>("/entities/sources"),
  getSource:        (id: number) => get<Source>(`/entities/sources/${id}`),
  deleteSource:     async (id: number): Promise<void> => {
    const r = await fetch(`${BASE}/entities/sources/${id}`, { method: "DELETE" });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ detail: r.statusText }));
      throw new Error(err.detail || r.statusText);
    }
  },
  getDecisions:     (sourceId?: number) =>
    get<Decision[]>(`/entities/decisions${sourceId ? `?source_id=${sourceId}` : ""}`),
  getGoals:         (sourceId?: number) =>
    get<Goal[]>(`/entities/goals${sourceId ? `?source_id=${sourceId}` : ""}`),
  getConstraints:   (sourceId?: number) =>
    get<Constraint[]>(`/entities/constraints${sourceId ? `?source_id=${sourceId}` : ""}`),
  getOpenQuestions: (sourceId?: number) =>
    get<OpenQuestion[]>(`/entities/open-questions${sourceId ? `?source_id=${sourceId}` : ""}`),
  getActionItems:   (sourceId?: number) =>
    get<ActionItem[]>(`/entities/action-items${sourceId ? `?source_id=${sourceId}` : ""}`),
  getInsights:      () => get<InsightReport>("/insights"),
};
