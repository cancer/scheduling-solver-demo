import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Layout from "./+layout.svelte";

describe("date layout", () => {
  it("shows the selected date and marks the current tab", () => {
    render(Layout, {
      data: { date: "2026-09-08" },
      currentPath: "/days/2026-09-08/requirements",
    });

    expect((document.querySelector("input[type=date]") as HTMLInputElement).value).toBe(
      "2026-09-08",
    );
    expect(screen.getByRole("link", { name: "必要人数" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(screen.getByRole("link", { name: "出勤可能時間帯" }).getAttribute("aria-current")).toBe(
      null,
    );
    expect(screen.getByRole("link", { name: "従業員管理" }).getAttribute("href")).toBe(
      "/employees",
    );
  });

  it("navigates to the same tab when the date picker changes", async () => {
    render(Layout, {
      data: { date: "2026-09-08" },
      currentPath: "/days/2026-09-08/availability",
    });

    await fireEvent.change(document.querySelector("input[type=date]") as HTMLInputElement, {
      target: { value: "2026-09-09" },
    });

    expect(window.location.pathname).toBe("/days/2026-09-09/availability");
  });
});
