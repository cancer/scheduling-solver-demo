import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import Layout from "./+layout.svelte";
import type { ApiClient } from "$lib/api/client";

function fakeApiClient(): ApiClient {
  return {
    getEmployees: vi.fn(),
    putEmployees: vi.fn(),
    getDay: vi.fn(),
    putDay: vi.fn(),
    solveDay: vi.fn(),
    reset: vi.fn(async () => undefined),
  };
}

describe("root layout", () => {
  it("cancels pending saves before resetting and exposes the global reset action", async () => {
    const apiClient = fakeApiClient();
    render(Layout, { apiClient });

    expect(screen.getByRole("button", { name: "初期データに戻す" })).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "初期データに戻す" }));

    expect(apiClient.reset).toHaveBeenCalledTimes(1);
  });
});
