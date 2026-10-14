import type { SourceLeafPath } from "../port-map";
import { sourceProcedure } from "../procedure";
import { searchDuckDuckGoBangsAsync } from "./-apps-search/bangs";
import { createBangsDataset } from "./-bangs-search/helpers";
import type { BangsSearchProcedureResources } from "./-bangs-search/resources";
import { bangsSearchInputSchema } from "./bangs";

export type {
  BangsDatasetCache,
  BangsDatasetEntry,
  BangsDatasetTimer,
  BangsSearchProcedureResources,
  BangsTrustedFetchOperation,
} from "./-bangs-search/resources";

export const bangsSearchDraftPaths = ["bangs.search"] as const satisfies readonly SourceLeafPath[];

export function createBangsSearchProcedures(resources: BangsSearchProcedureResources) {
  const dataset = createBangsDataset(resources);
  return {
    search: sourceProcedure({ path: "bangs.search", kind: "query", access: { kind: "public" }, demo: "guarded" })
      .input(bangsSearchInputSchema)
      .handler(({ context, input }) => searchDuckDuckGoBangsAsync(input, dataset, context.signal)),
  };
}
