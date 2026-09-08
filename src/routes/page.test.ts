import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Page from "./+page.svelte";

describe("+page.svelte", () => {
  it("renders the heading and the counter", () => {
    render(Page);

    expect(screen.getByRole("heading", { name: "シフト管理デモ" })).toBeTruthy();
    expect(screen.getByRole("button")).toBeTruthy();
  });
});
