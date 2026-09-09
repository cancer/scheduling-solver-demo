import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AvailabilityEditor from "./AvailabilityEditor.svelte";
import type { StoredEmployee } from "../api/types";
import type { DayAvailability } from "../domain/day";

const alice: StoredEmployee = {
  id: "e1",
  name: "アリス",
  roles: ["hall"],
  minShiftLength: 8,
  maxShiftLength: 16,
};

describe("AvailabilityEditor", () => {
  it("shows an employee with no entry as off", () => {
    render(AvailabilityEditor, { employees: [alice], availability: {}, oncommit: vi.fn() });

    const checkbox = screen.getByRole("checkbox", { name: "アリス 出勤" }) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it("calls oncommit with the employee's window removed when off is checked", async () => {
    const oncommit = vi.fn();
    const availability: DayAvailability = { e1: { start: 0, end: 16 } };
    render(AvailabilityEditor, { employees: [alice], availability, oncommit });

    await fireEvent.click(screen.getByRole("checkbox", { name: "アリス 出勤" }));

    expect(oncommit).toHaveBeenCalledWith({});
  });

  it("calls oncommit with a default window when off is unchecked", async () => {
    const oncommit = vi.fn();
    render(AvailabilityEditor, { employees: [alice], availability: {}, oncommit });

    await fireEvent.click(screen.getByRole("checkbox", { name: "アリス 出勤" }));

    expect(oncommit).toHaveBeenCalledWith({
      e1: expect.objectContaining({ start: expect.any(Number), end: expect.any(Number) }),
    });
  });

  it("calls oncommit with an updated start slot when the start select changes", async () => {
    const oncommit = vi.fn();
    const availability: DayAvailability = { e1: { start: 0, end: 16 } };
    render(AvailabilityEditor, { employees: [alice], availability, oncommit });

    await fireEvent.change(screen.getByLabelText("アリス 開始"), { target: { value: "4" } });

    expect(oncommit).toHaveBeenCalledWith({ e1: { start: 4, end: 16 } });
  });

  it("calls oncommit with an updated end slot when the end select changes", async () => {
    const oncommit = vi.fn();
    const availability: DayAvailability = { e1: { start: 0, end: 16 } };
    render(AvailabilityEditor, { employees: [alice], availability, oncommit });

    await fireEvent.change(screen.getByLabelText("アリス 終了"), { target: { value: "20" } });

    expect(oncommit).toHaveBeenCalledWith({ e1: { start: 0, end: 20 } });
  });
});
