import { describe, expect, it } from "vitest";
import { isPinned, togglePinned } from "./pinning";
import type { StoredAssignment } from "./domain/day";

const assignmentA: StoredAssignment = { employeeId: "e1", role: "hall", start: 0, length: 8 };
const assignmentB: StoredAssignment = { employeeId: "e2", role: "hot", start: 4, length: 8 };

describe("togglePinned", () => {
  it("adds an assignment that is not yet pinned", () => {
    const result = togglePinned([], assignmentA);

    expect(result).toEqual([assignmentA]);
  });

  it("removes an assignment that is already pinned", () => {
    const result = togglePinned([assignmentA, assignmentB], assignmentA);

    expect(result).toEqual([assignmentB]);
  });

  it("does not mutate the input array", () => {
    const pinned = [assignmentA];

    togglePinned(pinned, assignmentB);

    expect(pinned).toEqual([assignmentA]);
  });

  it("treats assignments with the same fields as the same assignment even as distinct objects", () => {
    const copy: StoredAssignment = { ...assignmentA };

    const result = togglePinned([assignmentA], copy);

    expect(result).toEqual([]);
  });
});

describe("isPinned", () => {
  it("returns true when an equal assignment is in the pinned list", () => {
    expect(isPinned([assignmentA], { ...assignmentA })).toBe(true);
  });

  it("returns false when no equal assignment is in the pinned list", () => {
    expect(isPinned([assignmentA], assignmentB)).toBe(false);
  });
});
