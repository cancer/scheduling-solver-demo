import type { DayData, StoredAssignment } from "../domain/day";
import type { StoredEmployee } from "./types";

// HTTP の契約（`/api/employees`・`/api/days/[date]`・`/api/days/[date]/solve`・
// `/api/reset`）を呼ぶ薄いクライアント。工程4（`src/routes/api/`）は本工程と並行に
// 実装されるため、この1モジュールへ HTTP 呼び出しを閉じ込め、`fetch` を注入可能に
// しておく（テストでは fake を渡す）。

export type FetchFn = typeof fetch;

export type ApiClient = Readonly<{
  getEmployees: () => Promise<readonly StoredEmployee[]>;
  putEmployees: (employees: readonly StoredEmployee[]) => Promise<readonly StoredEmployee[]>;
  getDay: (date: string) => Promise<DayData>;
  putDay: (date: string, day: DayData) => Promise<DayData>;
  solveDay: (date: string, pinnedAssignments: readonly StoredAssignment[]) => Promise<DayData>;
  reset: () => Promise<void>;
}>;

class ApiError extends Error {}

async function requestJson<T>(
  fetchFn: FetchFn,
  url: string,
  init: RequestInit | undefined,
): Promise<T> {
  const response = await fetchFn(url, init);
  const body: unknown = await response.json();
  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
        ? body.error
        : `リクエストに失敗した（HTTP ${response.status}）`;
    throw new ApiError(message);
  }
  return body as T;
}

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function createApiClient(fetchFn: FetchFn): ApiClient {
  return {
    async getEmployees() {
      const { employees } = await requestJson<{ employees: readonly StoredEmployee[] }>(
        fetchFn,
        "/api/employees",
        undefined,
      );
      return employees;
    },

    async putEmployees(employees) {
      const result = await requestJson<{ employees: readonly StoredEmployee[] }>(
        fetchFn,
        "/api/employees",
        jsonInit("PUT", { employees }),
      );
      return result.employees;
    },

    async getDay(date) {
      const { day } = await requestJson<{ day: DayData }>(fetchFn, `/api/days/${date}`, undefined);
      return day;
    },

    async putDay(date, day) {
      const result = await requestJson<{ day: DayData }>(
        fetchFn,
        `/api/days/${date}`,
        jsonInit("PUT", { day }),
      );
      return result.day;
    },

    async solveDay(date, pinnedAssignments) {
      const result = await requestJson<{ day: DayData }>(
        fetchFn,
        `/api/days/${date}/solve`,
        jsonInit("POST", { pinnedAssignments }),
      );
      return result.day;
    },

    async reset() {
      await requestJson<{ ok: true }>(fetchFn, "/api/reset", { method: "POST" });
    },
  };
}
