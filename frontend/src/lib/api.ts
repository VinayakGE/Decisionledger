const BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export interface Source {
  id: number;
  filename: string;
  source_type: string;
  uploaded_at: string;
  conversation_count: number;
}

export interface Decision {
  id: number;
  title: string;
  description: string | null;
  timestamp: string | null;
  confidence: number;
  source_reference: string | null;
  supporting_snippet: string | null;
  source_id: number | null;
  reasons: Reason[];
  evidence: Evidence[];
}

export interface Reason {
  id: number;
  description: string;
  confidence: number;
}

export interface Evidence {
  id: number;
  description: string;
  source_reference: string | null;
}

export interface Goal {
  id: number;
  description: string;
  status: string;
  confidence: number;
  source_reference: string | null;
  supporting_snippet: string | null;
  frequency: number;
}

export interface Constraint {
  id: number;
  description: string;
  confidence: number;
  source_reference: string | null;
  supporting_snippet: string | null;
}

export interface OpenQuestion {
  id: number;
  description: string;
  confidence: number;
  source_reference: string | null;
  supporting_snippet: string | null;
}

export interface ActionItem {
  id: number;
  description: string;
  status: string;
  confidence: number;
  source_reference: string | null;
  supporting_snippet: string | null;
}

export interface RecurringQuestionGroup {
  representative: string;
  occurrences: string[];
  count: number;
}

export interface DecisionReversal {
  original: Decision;
  reversal: Decision;
  similarity: number;
}

export interface BlindSpot {
  topic: string;
  discussion_count: number;
  action_count: number;
  ratio: number;
}

export interface InsightReport {
  recurring_questions: RecurringQuestionGroup[];
  decision_reversals: DecisionReversal[];
  top_goals: Goal[];
  blind_spots: BlindSpot[];
  total_decisions: number;
  total_open_questions: number;
  total_action_items: number;
}

export interface UploadResponse {
  source_id: number;
  filename: string;
  source_type: string;
  conversation_count: number;
  entities_extracted: number;
}

async function get<T>(path: string): Promise<T> {
  const r = await fetch(BASE + path);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

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
  getSources: () => get<Source[]>("/entities/sources"),
  getDecisions: (sourceId?: number) =>
    get<Decision[]>(`/entities/decisions${sourceId ? `?source_id=${sourceId}` : ""}`),
  getGoals: (sourceId?: number) =>
    get<Goal[]>(`/entities/goals${sourceId ? `?source_id=${sourceId}` : ""}`),
  getConstraints: (sourceId?: number) =>
    get<Constraint[]>(`/entities/constraints${sourceId ? `?source_id=${sourceId}` : ""}`),
  getOpenQuestions: (sourceId?: number) =>
    get<OpenQuestion[]>(`/entities/open-questions${sourceId ? `?source_id=${sourceId}` : ""}`),
  getActionItems: (sourceId?: number) =>
    get<ActionItem[]>(`/entities/action-items${sourceId ? `?source_id=${sourceId}` : ""}`),
  getInsights: () => get<InsightReport>("/insights"),
};
