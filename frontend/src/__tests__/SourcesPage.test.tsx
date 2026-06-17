import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SourcesPage } from "../pages/SourcesPage";
import { api } from "../lib/api";

vi.mock("../lib/api", () => ({
  api: {
    getSources: vi.fn(),
    deleteSource: vi.fn(),
  },
}));

const mockSources = [
  {
    id: 1,
    filename: "conversations.json",
    source_type: "chatgpt",
    conversation_count: 10,
    entities_extracted: 5,
    extraction_status: "completed",
    provider_used: "anthropic",
    extraction_confidence_avg: 0.9,
    extraction_duration_ms: 3000,
    uploaded_at: "2024-01-01T00:00:00",
    fallback_chain_json: null,
  },
  {
    id: 2,
    filename: "notes.md",
    source_type: "markdown",
    conversation_count: 3,
    entities_extracted: 2,
    extraction_status: "heuristic_fallback",
    provider_used: "heuristic",
    extraction_confidence_avg: 0.6,
    extraction_duration_ms: 500,
    uploaded_at: "2024-01-02T00:00:00",
    fallback_chain_json: null,
  },
];

function renderSourcesPage() {
  return render(
    <MemoryRouter>
      <SourcesPage />
    </MemoryRouter>
  );
}

describe("SourcesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getSources).mockResolvedValue(mockSources as any);
    vi.mocked(api.deleteSource).mockResolvedValue(undefined);
  });

  it("renders list of sources", async () => {
    renderSourcesPage();
    await waitFor(() => expect(screen.getByText("conversations.json")).toBeInTheDocument());
    expect(screen.getByText("notes.md")).toBeInTheDocument();
    expect(screen.getByText("2 files")).toBeInTheDocument();
  });

  it("shows status badges", async () => {
    renderSourcesPage();
    await waitFor(() => expect(screen.getByText("conversations.json")).toBeInTheDocument());
    expect(screen.getByText("completed")).toBeInTheDocument();
    expect(screen.getByText("heuristic_fallback")).toBeInTheDocument();
  });

  it("shows empty state when no sources", async () => {
    vi.mocked(api.getSources).mockResolvedValue([]);
    renderSourcesPage();
    await waitFor(() => expect(screen.getByText(/no uploads yet/i)).toBeInTheDocument());
  });

  it("deletes a source and removes it from the list immediately", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(api.getSources)
      .mockResolvedValueOnce(mockSources as any)
      .mockResolvedValueOnce([mockSources[1]] as any);

    const user = userEvent.setup();
    renderSourcesPage();
    await waitFor(() => expect(screen.getByText("conversations.json")).toBeInTheDocument());

    const deleteButtons = screen.getAllByTitle("Delete source and all entities");
    await user.click(deleteButtons[0]);

    expect(vi.mocked(api.deleteSource)).toHaveBeenCalledWith(1);

    // Card removed immediately (optimistic)
    await waitFor(() => expect(screen.queryByText("conversations.json")).not.toBeInTheDocument());
    expect(screen.getByText("notes.md")).toBeInTheDocument();
  });

  it("shows error when delete fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(api.deleteSource).mockRejectedValue(new Error("404 Not Found"));

    const user = userEvent.setup();
    renderSourcesPage();
    await waitFor(() => expect(screen.getByText("conversations.json")).toBeInTheDocument());

    const deleteButtons = screen.getAllByTitle("Delete source and all entities");
    await user.click(deleteButtons[0]);

    await waitFor(() => expect(screen.getByText("404 Not Found")).toBeInTheDocument());
    // Card still present on failure
    expect(screen.getByText("conversations.json")).toBeInTheDocument();
  });

  it("does not delete when confirm is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);

    const user = userEvent.setup();
    renderSourcesPage();
    await waitFor(() => expect(screen.getByText("conversations.json")).toBeInTheDocument());

    const deleteButtons = screen.getAllByTitle("Delete source and all entities");
    await user.click(deleteButtons[0]);

    expect(vi.mocked(api.deleteSource)).not.toHaveBeenCalled();
    expect(screen.getByText("conversations.json")).toBeInTheDocument();
  });
});
