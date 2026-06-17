import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useData } from "../hooks/useData";

describe("useData", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns data on successful fetch", async () => {
    const fetcher = vi.fn().mockResolvedValue([1, 2, 3]);
    const { result } = renderHook(() => useData(fetcher));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([1, 2, 3]);
    expect(result.current.error).toBeNull();
  });

  it("sets error on fetch failure", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useData(fetcher));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("Network error");
  });

  it("reload re-fetches data", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(["first"])
      .mockResolvedValueOnce(["second"]);
    const { result } = renderHook(() => useData(fetcher));

    await waitFor(() => expect(result.current.data).toEqual(["first"]));
    result.current.reload();
    await waitFor(() => expect(result.current.data).toEqual(["second"]));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("reload resets error state on success", async () => {
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(["ok"]);
    const { result } = renderHook(() => useData(fetcher));

    await waitFor(() => expect(result.current.error).toBe("boom"));
    result.current.reload();
    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.data).toEqual(["ok"]);
  });
});
