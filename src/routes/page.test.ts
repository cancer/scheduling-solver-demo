import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Page from "./+page.svelte";

describe("+page.svelte", () => {
  it("wires up the Counter component under the heading", async () => {
    render(Page);

    expect(screen.getByRole("heading", { name: "シフト管理デモ" }).textContent).toBe(
      "シフト管理デモ",
    );

    // 見出しの存在だけでなく、実際に Counter が配置され機能していることまで固定する。
    const button = screen.getByRole("button");
    expect(button.textContent).toBe("0");

    await fireEvent.click(button);

    expect(button.textContent).toBe("1");
  });
});
