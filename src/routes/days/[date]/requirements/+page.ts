import { createApiClient } from "$lib/api/client";
import { loadDay } from "$lib/api/loaders";

export async function load({
  fetch,
  params,
}: {
  fetch: typeof globalThis.fetch;
  params: { date: string };
}) {
  return loadDay(createApiClient(fetch), params.date);
}
