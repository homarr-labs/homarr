import { authenticatedProcedure } from "../procedure";
import { createUpdateCheckerRequest } from "./-update-checker/helpers";
import type { UpdateCheckerProcedureResources } from "./-update-checker/resources";

export const updateCheckerImplementedPaths = ["updateChecker.getAvailableUpdates"] as const;
export const updateCheckerPendingPaths = [] as const;

export function createUpdateCheckerProcedures(resources: UpdateCheckerProcedureResources) {
  const getAvailableUpdates = authenticatedProcedure({
    path: "updateChecker.getAvailableUpdates",
    kind: "query",
    access: { kind: "permission", permission: "admin" },
    demo: "guarded",
  }).handler(async ({ context }) => {
    let request: ReturnType<typeof createUpdateCheckerRequest> | undefined;
    try {
      request = createUpdateCheckerRequest(resources, context);
      const handler = request.handler({});
      const data = await handler.getDataAsync();
      request.assertActive();
      return resources.isExternalConnectionAllowed() ? data.data.availableUpdates : [];
    } catch (error) {
      context.signal.throwIfAborted();
      request?.assertActive();
      resources.routerLogger.error(new Error("Failed to read the cached update check", { cause: error }));
      return [];
    }
  });
  return { getAvailableUpdates };
}
