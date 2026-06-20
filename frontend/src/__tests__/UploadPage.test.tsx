import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { UploadPage } from "../pages/UploadPage";
import { api } from "../lib/api";

vi.mock("../lib/api", () => ({
  api: {
    uploadFile: vi.fn(),
    getSource: vi.fn(),
    getSettings: vi.fn(),
    getSources: vi.fn(),
  },
  TERMINAL_STATUSES: new Set([
    "completed",
    "heuristic_fallback",
    "completed_with_fallback",
    "partial",
    "failed",
  ]),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => vi.fn() };
});

const mockUploadResponse = {
  source_id: 1,
  filename: "test.json",
  source_type: "chatgpt",
  conversation_count: 5,
  entities_extracted: 0,
  extraction_status: "pending",
  provider_used: null,
  extraction_confidence_avg: null,
  extraction_duration_ms: null,
  fallback_chain: [],
};

const mockCompletedSource = {
  id: 1,
  filename: "test.json",
  source_type: "chatgpt",
  conversation_count: 5,
  entities_extracted: 12,
  extraction_status: "completed",
  provider_used: "anthropic",
  extraction_confidence_avg: 0.85,
  extraction_duration_ms: 4200,
  uploaded_at: "2024-01-01T00:00:00",
  fallback_chain_json: null,
};

function renderUploadPage() {
  return render(
    <MemoryRouter>
      <UploadPage />
    </MemoryRouter>
  );
}

describe("UploadPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getSettings).mockResolvedValue({
      providers: [],
      heuristic_always_available: true,
      llm_enabled: false,
    } as any);
    vi.mocked(api.getSources).mockResolvedValue([]);
  });
  afterEach(() => vi.useRealTimers());

  it("renders the upload area in idle state", () => {
    renderUploadPage();
    expect(screen.getByText(/capture decisions instantly/i)).toBeInTheDocument();
    expect(screen.getByText(/instant capture \(recommended\)/i)).toBeInTheDocument();
  });

  it("shows uploading state while upload is in progress", async () => {
    let resolveUpload!: (v: typeof mockUploadResponse) => void;
    vi.mocked(api.uploadFile).mockReturnValue(
      new Promise((res) => {
        resolveUpload = res;
      })
    );

    renderUploadPage();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["{}"], "test.json", { type: "application/json" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText(/uploading and parsing/i)).toBeInTheDocument());
    resolveUpload(mockUploadResponse);
  });

  it("transitions to pending state after upload returns pending", async () => {
    vi.mocked(api.uploadFile).mockResolvedValue(mockUploadResponse);
    // getSource never resolves — keeps component in pending state
    vi.mocked(api.getSource).mockReturnValue(new Promise(() => {}));

    renderUploadPage();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["{}"], "test.json", { type: "application/json" });

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => expect(screen.getByText(/extracting entities/i)).toBeInTheDocument());
    expect(screen.getByText(/test\.json/i)).toBeInTheDocument();
  });

  it("polls until terminal status and shows done card", async () => {
    vi.mocked(api.uploadFile).mockResolvedValue(mockUploadResponse);
    vi.mocked(api.getSource).mockResolvedValue(mockCompletedSource as any);

    renderUploadPage();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["{}"], "test.json", { type: "application/json" });

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    // Wait for the poll to fire (2 s interval) and complete
    await waitFor(() => expect(screen.getByText(/extraction complete/i)).toBeInTheDocument(), {
      timeout: 5000,
    });
    expect(screen.getByText("12")).toBeInTheDocument(); // entities_extracted
  });

  it("shows error state on upload failure", async () => {
    vi.mocked(api.uploadFile).mockRejectedValue(new Error("413 File too large"));

    renderUploadPage();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["{}"], "big.json", { type: "application/json" });

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => expect(screen.getByText(/413 File too large/i)).toBeInTheDocument());
  });

  it("stops polling after unmount", async () => {
    vi.mocked(api.uploadFile).mockResolvedValue(mockUploadResponse);
    // Never resolves — keeps polling active
    vi.mocked(api.getSource).mockReturnValue(new Promise(() => {}));

    const { unmount } = renderUploadPage();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["{}"], "test.json", { type: "application/json" });

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await waitFor(() => expect(screen.getByText(/extracting entities/i)).toBeInTheDocument());

    // Unmounting should clear the interval; no more calls after this
    const callsBefore = vi.mocked(api.getSource).mock.calls.length;
    unmount();
    // Wait longer than one poll interval to confirm no new calls
    await new Promise((r) => setTimeout(r, 2500));
    expect(vi.mocked(api.getSource).mock.calls.length).toBe(callsBefore);
  });
});
