import { byIdSchema } from "@homarr/validation/common";

import { authenticatedProcedure } from "../procedure";
import { removeSearchEngineWithDefaultsAsync } from "./-search-engine-deletion/helpers";
import type { SearchEngineDeletionResources } from "./-search-engine-deletion/resources";

export const searchEngineDeletionImplementedPaths = ["searchEngine.delete"] as const;
export const searchEngineDeletionPendingPaths = [] as const;
export const searchEngineDeletionBindingHeldPaths = ["searchEngine.delete"] as const;

export function createSearchEngineDeletionProcedures(resources: SearchEngineDeletionResources) {
  return {
    delete: authenticatedProcedure({
      path: "searchEngine.delete",
      kind: "mutation",
      access: { kind: "permission", permission: "search-engine-full-all" },
      demo: "guarded",
    })
      .input(byIdSchema)
      .handler(async ({ context, input }) => {
        await removeSearchEngineWithDefaultsAsync(resources, context.db, input.id);
      }),
  };
}
