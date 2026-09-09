import { createApiClient } from "$lib/api/client";
import { loadEmployees } from "$lib/api/loaders";

export async function load({ fetch }: { fetch: typeof globalThis.fetch }) {
  return loadEmployees(createApiClient(fetch));
}
