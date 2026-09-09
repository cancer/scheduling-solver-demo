import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Page from "./+page.svelte";

describe("entry page", () => {
  it("explains the date-first workflow and links to the selected day", () => {
    render(Page, { initialDate: "2026-09-08" });

    expect(screen.getByRole("heading", { name: "シフト管理デモ" })).toBeTruthy();
    expect(screen.getByText(/対象日付を選んで/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "この日のシフトを開く" }).getAttribute("href")).toBe(
      "/days/2026-09-08/requirements",
    );
  });

  it("provides a link to the shared employee master", () => {
    render(Page, { initialDate: "2026-09-08" });

    expect(screen.getByRole("link", { name: "従業員を管理する" }).getAttribute("href")).toBe(
      "/employees",
    );
  });
});
