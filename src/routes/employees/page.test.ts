import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import Page from "./+page.svelte";
import type { ApiClient } from "$lib/api/client";
import type { StoredEmployee } from "$lib/api/types";

const alice: StoredEmployee = {
  id: "e1",
  name: "アリス",
  roles: ["hall"],
  minShiftLength: 8,
  maxShiftLength: 16,
};

function fakeApiClient(): ApiClient {
  return {
    getEmployees: vi.fn(async () => [alice]),
    putEmployees: vi.fn(async (employees) => employees),
    getDay: vi.fn(),
    putDay: vi.fn(),
    solveDay: vi.fn(),
    reset: vi.fn(),
  };
}

describe("employees page", () => {
  it("explains that the employee master is shared across dates", () => {
    render(Page, { data: { employees: [alice] }, apiClient: fakeApiClient() });

    expect(screen.getByRole("heading", { name: "従業員" })).toBeTruthy();
    expect(screen.getByText(/日付をまたいで共有/)).toBeTruthy();
    expect(screen.getByText(/自動保存/)).toBeTruthy();
  });

  it("wires valid shift length edits to immediate employee saving", async () => {
    const apiClient = fakeApiClient();
    render(Page, { data: { employees: [alice] }, apiClient });

    await fireEvent.change(screen.getByLabelText("アリス 勤務長さ下限（時間）"), {
      target: { value: "5" },
    });

    expect(apiClient.putEmployees).toHaveBeenCalledWith([{ ...alice, minShiftLength: 10 }]);
  });

  it("saves employee deletion immediately through the page API boundary", async () => {
    const apiClient = fakeApiClient();
    render(Page, { data: { employees: [alice] }, apiClient });

    await fireEvent.click(screen.getByRole("button", { name: "アリスを削除" }));

    expect(apiClient.putEmployees).toHaveBeenCalledWith([]);
  });
});
