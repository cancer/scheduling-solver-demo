import type { DayData } from "../domain/day";
import type { StoredEmployee } from "./types";
import type { ApiClient } from "./client";

export type EmployeesPageData = Readonly<{
  employees: readonly StoredEmployee[];
}>;

export type DayPageData = Readonly<{
  date: string;
  day: DayData;
}>;

export type DayWithEmployeesPageData = DayPageData & EmployeesPageData;

/** 従業員マスタだけを取得する。 */
export async function loadEmployees(apiClient: ApiClient): Promise<EmployeesPageData> {
  return { employees: await apiClient.getEmployees() };
}

/** 指定日の日付データだけを取得する。 */
export async function loadDay(apiClient: ApiClient, date: string): Promise<DayPageData> {
  return { date, day: await apiClient.getDay(date) };
}

/** 指定日を表示するための従業員マスタと日付データを取得する。 */
export async function loadDayWithEmployees(
  apiClient: ApiClient,
  date: string,
): Promise<DayWithEmployeesPageData> {
  const [employees, day] = await Promise.all([apiClient.getEmployees(), apiClient.getDay(date)]);
  return { date, employees, day };
}
