import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { FilterBar } from "../components/FilterBar";
import { Source } from "../lib/api";

const mockSources: Source[] = [
  {
    id: 1,
    filename: "conversations.json",
    source_type: "chatgpt",
    conversation_count: 5,
    entities_extracted: 10,
    extraction_status: "completed",
    provider_used: "anthropic",
    extraction_confidence_avg: 0.9,
    extraction_duration_ms: 3000,
    uploaded_at: "2024-01-01T00:00:00",
  },
  {
    id: 2,
    filename: "notes.md",
    source_type: "markdown",
    conversation_count: 2,
    entities_extracted: 4,
    extraction_status: "completed",
    provider_used: "heuristic",
    extraction_confidence_avg: 0.6,
    extraction_duration_ms: 200,
    uploaded_at: "2024-01-02T00:00:00",
  },
];

function Wrapper({
  initialSourceId = null,
  initialConfidence = 0,
  showConfidence = true,
}: {
  initialSourceId?: number | null;
  initialConfidence?: number;
  showConfidence?: boolean;
}) {
  const [sourceId, setSourceId] = useState<number | null>(initialSourceId);
  const [confidence, setConfidence] = useState(initialConfidence);
  return (
    <MemoryRouter>
      <FilterBar
        sources={mockSources}
        sourceId={sourceId}
        onSourceChange={setSourceId}
        minConfidence={confidence}
        onConfidenceChange={setConfidence}
        showConfidence={showConfidence}
      />
      <div data-testid="source-out">{sourceId ?? "all"}</div>
      <div data-testid="confidence-out">{confidence}</div>
    </MemoryRouter>
  );
}

describe("FilterBar", () => {
  it("renders source dropdown and confidence slider", () => {
    render(<Wrapper />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("slider")).toBeInTheDocument();
  });

  it("lists all sources plus 'All sources' option", () => {
    render(<Wrapper />);
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveTextContent("All sources");
    expect(options[1]).toHaveTextContent("conversations.json");
    expect(options[2]).toHaveTextContent("notes.md");
  });

  it("calls onSourceChange with the selected source id", async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    await user.selectOptions(screen.getByRole("combobox"), "1");
    expect(screen.getByTestId("source-out")).toHaveTextContent("1");
  });

  it("calls onSourceChange with null when 'All sources' selected", async () => {
    const user = userEvent.setup();
    render(<Wrapper initialSourceId={1} />);
    await user.selectOptions(screen.getByRole("combobox"), "");
    expect(screen.getByTestId("source-out")).toHaveTextContent("all");
  });

  it("shows current confidence percentage label", () => {
    render(<Wrapper initialConfidence={0.75} />);
    expect(screen.getByText(/75%/)).toBeInTheDocument();
  });

  it("updates confidence value when slider moves", () => {
    render(<Wrapper />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "0.6" } });
    expect(screen.getByTestId("confidence-out")).toHaveTextContent("0.6");
  });

  it("hides confidence slider when showConfidence=false", () => {
    render(<Wrapper showConfidence={false} />);
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders nothing when sources list is empty", () => {
    const { container } = render(
      <MemoryRouter>
        <FilterBar
          sources={[]}
          sourceId={null}
          onSourceChange={vi.fn()}
          minConfidence={0}
          onConfidenceChange={vi.fn()}
        />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });
});
