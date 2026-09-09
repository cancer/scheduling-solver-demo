import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import EmployeeManager from "./EmployeeManager.svelte";
import type { StoredEmployee } from "../api/types";

const alice: StoredEmployee = {
  id: "e1",
  name: "アリス",
  roles: ["hall"],
  minShiftLength: 8,
  maxShiftLength: 16,
};

describe("EmployeeManager", () => {
  it("lists the existing employees by name", () => {
    render(EmployeeManager, { employees: [alice], onchange: vi.fn() });

    const input = screen.getByLabelText("アリスの名前") as HTMLInputElement;
    expect(input.value).toBe("アリス");
  });

  it("calls onchange with the employee removed when its delete button is clicked", async () => {
    const onchange = vi.fn();
    render(EmployeeManager, { employees: [alice], onchange });

    await fireEvent.click(screen.getByRole("button", { name: "アリスを削除" }));

    expect(onchange).toHaveBeenCalledWith([]);
  });

  it("calls onchange with a new employee appended when the add form is submitted", async () => {
    const onchange = vi.fn();
    render(EmployeeManager, { employees: [alice], onchange });

    await fireEvent.input(screen.getByLabelText("新しい従業員名"), {
      target: { value: "ボブ" },
    });
    await fireEvent.click(screen.getByRole("button", { name: "追加" }));

    expect(onchange).toHaveBeenCalledTimes(1);
    const result = onchange.mock.calls[0][0] as StoredEmployee[];
    expect(result).toHaveLength(2);
    expect(result[1].name).toBe("ボブ");
  });

  it("does not add an employee when the name is empty", async () => {
    const onchange = vi.fn();
    render(EmployeeManager, { employees: [alice], onchange });

    await fireEvent.click(screen.getByRole("button", { name: "追加" }));

    expect(onchange).not.toHaveBeenCalled();
  });

  it("calls onchange with the name updated when the name input changes", async () => {
    const onchange = vi.fn();
    render(EmployeeManager, { employees: [alice], onchange });

    await fireEvent.change(screen.getByLabelText("アリスの名前"), {
      target: { value: "アリス改" },
    });

    expect(onchange).toHaveBeenCalledWith([{ ...alice, name: "アリス改" }]);
  });

  it("calls onchange with the role toggled when a role checkbox is clicked", async () => {
    const onchange = vi.fn();
    render(EmployeeManager, { employees: [alice], onchange });

    await fireEvent.click(screen.getByRole("checkbox", { name: "アリス ホット" }));

    const result = onchange.mock.calls[0][0] as StoredEmployee[];
    expect(result[0].roles).toEqual(["hall", "hot"]);
  });

  it("shows stored shift length limits in hours", () => {
    render(EmployeeManager, { employees: [alice], onchange: vi.fn() });

    expect((screen.getByLabelText("アリス 勤務長さ下限（時間）") as HTMLInputElement).value).toBe(
      "4",
    );
    expect((screen.getByLabelText("アリス 勤務長さ上限（時間）") as HTMLInputElement).value).toBe(
      "8",
    );
  });

  it("saves a valid shift length edit through onchange in stored slots", async () => {
    const onchange = vi.fn();
    render(EmployeeManager, { employees: [alice], onchange });

    await fireEvent.change(screen.getByLabelText("アリス 勤務長さ下限（時間）"), {
      target: { value: "5" },
    });

    expect(onchange).toHaveBeenCalledWith([{ ...alice, minShiftLength: 10 }]);
  });

  it("saves a valid upper limit edit through onchange in stored slots", async () => {
    const onchange = vi.fn();
    render(EmployeeManager, { employees: [alice], onchange });

    await fireEvent.change(screen.getByLabelText("アリス 勤務長さ上限（時間）"), {
      target: { value: "7" },
    });

    expect(onchange).toHaveBeenCalledWith([{ ...alice, maxShiftLength: 14 }]);
  });

  it("shows an error and does not save an invalid reversed range", async () => {
    const onchange = vi.fn();
    render(EmployeeManager, { employees: [alice], onchange });

    await fireEvent.change(screen.getByLabelText("アリス 勤務長さ下限（時間）"), {
      target: { value: "9" },
    });

    expect(onchange).not.toHaveBeenCalled();
    expect(screen.getByText(/下限は上限以下/)).toBeTruthy();
  });
});
