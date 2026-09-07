export const SLOT_COUNT = 28;
export const MIN_SHIFT_LENGTH = 8;
export const MAX_SHIFT_LENGTH = 16;

export const ROLES = ["hall", "hot", "cold", "dishwashing"] as const;
export type Role = (typeof ROLES)[number];

export type Availability = Readonly<{
  start: number;
  end: number;
}>;

export type Employee = Readonly<{
  id: string;
  name: string;
  roles: readonly Role[];
  availability?: Availability;
  minShiftLength: number;
  maxShiftLength: number;
}>;

export type SlotRequirements = Readonly<Record<Role, number>>;

export type ScheduleFixture = Readonly<{
  employees: readonly Employee[];
  requirements: readonly SlotRequirements[];
}>;

export type ShiftCandidate = Readonly<{
  employeeId: string;
  role: Role;
  start: number;
  length: number;
  end: number;
  variableName: string;
}>;

export type ShortageVariable = Readonly<{
  slot: number;
  role: Role;
  name: string;
}>;

export type LpModel = Readonly<{
  lpText: string;
  candidates: readonly ShiftCandidate[];
  binaryVariableNames: readonly string[];
  shortageVariables: readonly ShortageVariable[];
  penaltyM: number;
}>;

export type ScheduleAssignment = Readonly<{
  employeeId: string;
  role: Role;
  start: number;
  length: number;
  end: number;
}>;

export type ScheduleShortage = Readonly<{
  slot: number;
  role: Role;
  amount: number;
}>;

export type ScheduleSolution = Readonly<{
  status: string;
  objectiveValue: number;
  assignments: readonly ScheduleAssignment[];
  shortages: readonly ScheduleShortage[];
}>;

export type SolveResponse = Readonly<{
  status: string;
  objectiveValue: number;
  assignments: readonly ScheduleAssignment[];
  shortages: readonly ScheduleShortage[];
  model: Readonly<{
    binaryVariableCount: number;
    shortageVariableCount: number;
    penaltyM: number;
  }>;
}>;
