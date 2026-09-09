import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import Page from "./+page.svelte";
import type { ApiClient } from "$lib/api/client";
import type { DayData } from "$lib/domain/day";
import { emptyRequirements } from "$lib/domain/shift";

const day: DayData = {
  requirements: emptyRequirements(),
  availability: {},
  pinnedAssignments: [],
  solution: null,
};

function fakeApiClient(): ApiClient {
  return {
    getEmployees: vi.fn(),
    putEmployees: vi.fn(),
    getDay: vi.fn(),
    putDay: vi.fn(async (_date, nextDay) => nextDay),
    solveDay: vi.fn(),
    reset: vi.fn(),
  };
}

describe("requirements page", () => {
  it("explains the 30-minute role grid and autosaves one changed day", async () => {
    vi.useFakeTimers();
    try {
      const apiClient = fakeApiClient();
      render(Page, { data: { date: "2026-09-08", day }, apiClient });

      expect(screen.getByRole("heading", { name: "必要人数" })).toBeTruthy();
      expect(screen.getByText(/30分コマ/)).toBeTruthy();
      await fireEvent.keyDown(screen.getByRole("button", { name: "ホール 10:00 必要人数0人" }), {
        key: "ArrowUp",
      });
      await vi.advanceTimersByTimeAsync(500);
      expect(apiClient.putDay).toHaveBeenCalledWith(
        "2026-09-08",
        expect.objectContaining({
          requirements: expect.arrayContaining([expect.objectContaining({ hall: 1 })]),
        }),
      );
      expect(apiClient.putDay).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
