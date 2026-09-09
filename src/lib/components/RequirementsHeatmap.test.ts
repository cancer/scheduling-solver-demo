import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import RequirementsHeatmap from "./RequirementsHeatmap.svelte";
import { emptyRequirements } from "../domain/shift";

describe("RequirementsHeatmap", () => {
  it("does not commit while a drag is in progress, and commits all painted cells together on release", async () => {
    const oncommit = vi.fn();
    render(RequirementsHeatmap, { requirements: emptyRequirements(), oncommit });

    await fireEvent.input(screen.getByLabelText("塗る値"), { target: { value: "3" } });

    const cellA = screen.getByRole("button", { name: "ホール 10:00 必要人数0人" });
    const cellB = screen.getByRole("button", { name: "ホール 10:30 必要人数0人" });

    await fireEvent.pointerDown(cellA);
    expect(oncommit).not.toHaveBeenCalled();

    await fireEvent.pointerEnter(cellB, { buttons: 1 });
    expect(oncommit).not.toHaveBeenCalled();

    await fireEvent.pointerUp(window);

    expect(oncommit).toHaveBeenCalledTimes(1);
    const committed = oncommit.mock.calls[0][0];
    expect(committed[0].hall).toBe(3);
    expect(committed[1].hall).toBe(3);
    expect(committed[0].hot).toBe(0);
  });

  it("ignores pointerenter on cells while not painting", async () => {
    const oncommit = vi.fn();
    render(RequirementsHeatmap, { requirements: emptyRequirements(), oncommit });

    const cell = screen.getByRole("button", { name: "ホット 10:00 必要人数0人" });
    await fireEvent.pointerEnter(cell, { buttons: 1 });
    await fireEvent.pointerUp(window);

    expect(oncommit).not.toHaveBeenCalled();
  });

  it("increments the focused cell's headcount on ArrowUp and commits immediately", async () => {
    const oncommit = vi.fn();
    render(RequirementsHeatmap, { requirements: emptyRequirements(), oncommit });

    const cell = screen.getByRole("button", { name: "コールド 10:00 必要人数0人" });
    cell.focus();
    await fireEvent.keyDown(cell, { key: "ArrowUp" });

    expect(oncommit).toHaveBeenCalledTimes(1);
    expect(oncommit.mock.calls[0][0][0].cold).toBe(1);
  });

  it("does not decrement a cell's headcount below zero on ArrowDown", async () => {
    const oncommit = vi.fn();
    render(RequirementsHeatmap, { requirements: emptyRequirements(), oncommit });

    const cell = screen.getByRole("button", { name: "洗い場 10:00 必要人数0人" });
    cell.focus();
    await fireEvent.keyDown(cell, { key: "ArrowDown" });

    expect(oncommit.mock.calls[0][0][0].dishwashing).toBe(0);
  });

  it("ignores keys other than the arrow keys", async () => {
    const oncommit = vi.fn();
    render(RequirementsHeatmap, { requirements: emptyRequirements(), oncommit });

    const cell = screen.getByRole("button", { name: "ホール 10:00 必要人数0人" });
    cell.focus();
    await fireEvent.keyDown(cell, { key: "Enter" });

    expect(oncommit).not.toHaveBeenCalled();
  });

  it("shows the headcount as visible text on the cell, not only as a color", () => {
    const requirements = emptyRequirements();
    render(RequirementsHeatmap, { requirements, oncommit: vi.fn() });

    const cell = screen.getByRole("button", { name: "ホール 10:00 必要人数0人" });
    expect(cell.textContent).toContain("0");
  });
});
