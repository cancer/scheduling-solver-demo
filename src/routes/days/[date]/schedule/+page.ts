import { createApiClient } from "$lib/api/client";
import { loadDayWithEmployees } from "$lib/api/loaders";

export async function load({
  fetch,
  params,
}: {
  fetch: typeof globalThis.fetch;
  params: { date: string };
}) {
  return loadDayWithEmployees(createApiClient(fetch), params.date);
}
