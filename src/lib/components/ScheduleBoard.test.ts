import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import ScheduleBoard from "./ScheduleBoard.svelte";
import type { StoredEmployee } from "../api/types";
import type { StoredSolution } from "../domain/day";

const alice: StoredEmployee = {
  id: "e1",
  name: "アリス",
  roles: ["hall"],
  minShiftLength: 8,
  maxShiftLength: 16,
};

const solution: StoredSolution = {
  status: "optimal",
  objectiveValue: 0,
  assignments: [{ employeeId: "e1", role: "hall", start: 0, length: 8 }],
  shortages: [{ slot: 4, role: "hall", amount: 2 }],
};

describe("ScheduleBoard", () => {
  it("shows a not-yet-solved message when there is no solution", () => {
    render(ScheduleBoard, {
      employees: [alice],
      solution: null,
      pinnedAssignments: [],
      ontogglepin: vi.fn(),
    });

    expect(screen.getByText("未求解")).toBeTruthy();
  });

  it("renders a clickable bar for each assignment naming the employee, role and time range", () => {
    render(ScheduleBoard, {
      employees: [alice],
      solution,
      pinnedAssignments: [],
      ontogglepin: vi.fn(),
    });

    const bar = screen.getByRole("button", { name: /アリス.*ホール.*10:00.*14:00/ });
    expect(bar).toBeTruthy();
  });

  it("keeps the full assignment label available when a bar is visually truncated", () => {
    render(ScheduleBoard, {
      employees: [alice],
      solution,
      pinnedAssignments: [],
      ontogglepin: vi.fn(),
    });

    const bar = screen.getByRole("button", { name: /アリス/ });
    expect(bar.getAttribute("title") ?? bar.getAttribute("aria-label")).toBe(
      "アリス ホール 10:00-14:00",
    );
  });

  it("calls ontogglepin with the assignment when its bar is clicked", async () => {
    const ontogglepin = vi.fn();
    render(ScheduleBoard, {
      employees: [alice],
      solution,
      pinnedAssignments: [],
      ontogglepin,
    });

    await fireEvent.click(screen.getByRole("button", { name: /アリス/ }));

    expect(ontogglepin).toHaveBeenCalledWith(solution.assignments[0]);
  });

  it("marks a pinned assignment's bar as pressed", () => {
    render(ScheduleBoard, {
      employees: [alice],
      solution,
      pinnedAssignments: [solution.assignments[0]],
      ontogglepin: vi.fn(),
    });

    const bar = screen.getByRole("button", { name: /アリス/ });
    expect(bar.getAttribute("aria-pressed")).toBe("true");
  });

  it("falls back to the employee id when no matching employee is found", () => {
    render(ScheduleBoard, {
      employees: [],
      solution,
      pinnedAssignments: [],
      ontogglepin: vi.fn(),
    });

    expect(screen.getByRole("button", { name: /^e1/ })).toBeTruthy();
  });

  it("shows the shortage amount for the slot and role that is short-staffed", () => {
    render(ScheduleBoard, {
      employees: [alice],
      solution,
      pinnedAssignments: [],
      ontogglepin: vi.fn(),
    });

    expect(screen.getByLabelText("ホール 12:00 不足2人")).toBeTruthy();
  });

  it("places an assignment on the 28-slot timeline with a named employee-role row", () => {
    render(ScheduleBoard, {
      employees: [alice],
      solution,
      pinnedAssignments: [],
      ontogglepin: vi.fn(),
    });

    expect(screen.getByText("アリス / ホール")).toBeTruthy();
    const bar = screen.getByRole("button", { name: /アリス.*ホール/ });
    expect((bar as HTMLElement).style.gridColumn).toBe("1 / span 8");
  });

  it("uses the same hourly time headers for the shortage grid", () => {
    render(ScheduleBoard, {
      employees: [alice],
      solution,
      pinnedAssignments: [],
      ontogglepin: vi.fn(),
    });

    const headers = Array.from(document.querySelectorAll(".time-header"), (header) =>
      header.textContent?.trim(),
    );
    expect(headers.slice(0, 5)).toEqual(["10:00", "", "11:00", "", "12:00"]);
  });
});
