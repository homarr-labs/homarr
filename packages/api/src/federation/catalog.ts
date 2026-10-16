import { walkProcedureContractsAsync } from "@orpc/server";

import type { ApiMeta } from "../procedure";

type Access = "query" | "interact" | "full";
let paths: Promise<Map<string, Access>> | undefined;

/** Owner-approved scopes are derived from declared native integration operations. */
export async function getFederationProcedurePaths(access: Access = "full"): Promise<string[]> {
  paths ??= (async () => {
    const { appRouter } = await import("../root");
    const result = new Map<string, Access>([
      ["integration.all", "query"],
      ["integration.getKinds", "query"],
      ["integration.byId", "full"],
      ["integration.byIds", "query"],
      ["integration.searchMediaRequests", "query"],
      ["integration.testConnection", "full"],
      ["integration.request", "full"],
      ["federation.executeSource", "full"],
    ]);
    await walkProcedureContractsAsync(appRouter, (procedure, path) => {
      const meta = procedure["~orpc"].meta as ApiMeta;
      if (meta.integration) result.set(path.join("."), meta.integration.action);
    });
    return result;
  })();
  const catalog = await paths;
  return [...catalog]
    .filter(
      ([, required]) => required === "query" || access === "full" || (required === "interact" && access === "interact"),
    )
    .map(([path]) => path)
    .toSorted();
}
