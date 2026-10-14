import type { SourceLeafPath } from "../port-map";
import { sourceProcedure } from "../procedure";
import { createGroupEstablishmentHelpers } from "./-group-establishment/helpers";
import type { GroupEstablishmentProcedureResources } from "./-group-establishment/resources";

export type { GroupEstablishmentProcedureResources } from "./-group-establishment/resources";

export const groupEstablishmentImplementedPaths = [
  "group.createInitialExternalGroup",
] as const satisfies readonly SourceLeafPath[];
export const groupEstablishmentPendingPaths = [] as const satisfies readonly SourceLeafPath[];

export function createGroupEstablishmentProcedures(resources: GroupEstablishmentProcedureResources) {
  const { createInitialExternalGroupAsync } = createGroupEstablishmentHelpers(resources);

  return {
    createInitialExternalGroup: sourceProcedure({
      path: "group.createInitialExternalGroup",
      kind: "mutation",
      access: { kind: "onboardingStep", step: "group" },
      demo: "guarded",
    })
      .input(resources.schemas.groupCreateSchema)
      .handler(({ context, input }) => createInitialExternalGroupAsync(context, input)),
  };
}
