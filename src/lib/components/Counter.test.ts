import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Counter from "./Counter.svelte";

describe("Counter", () => {
  it("increments the displayed count when clicked", async () => {
    render(Counter);

    const button = screen.getByRole("button");
    expect(button.textContent).toContain("0");

    await fireEvent.click(button);

    expect(button.textContent).toContain("1");
  });

  it("shows the limit message only once the count reaches 3", async () => {
    render(Counter);

    const button = screen.getByRole("button");

    await fireEvent.click(button);
    expect(screen.queryByText("上限に達しました")).toBeNull();

    await fireEvent.click(button);
    expect(screen.queryByText("上限に達しました")).toBeNull();

    await fireEvent.click(button);
    expect(screen.queryByText("上限に達しました")?.textContent).toBe("上限に達しました");
  });
});
