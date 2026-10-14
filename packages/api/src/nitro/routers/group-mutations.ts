import { ORPCError } from "@orpc/server";

import type { SourceLeafPath } from "../port-map";
import { authenticatedProcedure } from "../procedure";
import { createGroupMutationsHelpers } from "./-group-mutations/helpers";
import type { GroupMutationsProcedureResources } from "./-group-mutations/resources";

export { groupMutationsExecutionHold } from "./-group-mutations/resources";
export type { GroupMutationsProcedureResources } from "./-group-mutations/resources";

export const groupMutationsPreparedPaths = [
  "group.savePositions",
  "group.savePermissions",
] as const satisfies readonly SourceLeafPath[];
export const groupMutationsExecutionHeldPaths = groupMutationsPreparedPaths;

export function createGroupMutationsProcedures(resources: GroupMutationsProcedureResources) {
  const { savePositionsAsync, savePermissionsAsync } = createGroupMutationsHelpers(resources);
  const heldMutation = (path: (typeof groupMutationsPreparedPaths)[number]) =>
    authenticatedProcedure({
      path,
      kind: "mutation",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    }).use(() => {
      throw new ORPCError("SERVICE_UNAVAILABLE", { message: resources.execution.reason });
    });

  return {
    savePositions: heldMutation("group.savePositions")
      .input(resources.schemas.groupSavePositionsSchema)
      .handler(({ context, input }) => savePositionsAsync(context, input)),
    savePermissions: heldMutation("group.savePermissions")
      .input(resources.schemas.groupSavePermissionsSchema)
      .handler(({ context, input }) => savePermissionsAsync(context, input)),
  };
}
