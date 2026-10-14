import z from "zod/v4";

import { logLevels } from "@homarr/core/infrastructure/logs/constants";
import { zodEnumFromArray } from "@homarr/validation/enums";

import type { SourceLeafPath } from "../port-map";
import { authenticatedProcedure } from "../procedure";
import { createLogSubscriptionIterator } from "./-logs/helpers";
import type { LogProcedureResources } from "./-logs/resources";

export type { LogProcedureLease, LogProcedureResources } from "./-logs/resources";

export const logImplementedPaths = ["log.subscribe"] as const satisfies readonly SourceLeafPath[];
export const logPendingPaths = [] as const satisfies readonly SourceLeafPath[];

export function createLogProcedures(resources: LogProcedureResources) {
  return {
    subscribe: authenticatedProcedure({
      path: "log.subscribe",
      kind: "subscription",
      access: { kind: "permission", permission: "other-view-logs" },
      demo: "guarded",
    })
      .input(
        z.object({
          levels: z.array(zodEnumFromArray(logLevels)).default(["info"]),
        }),
      )
      .handler(({ context, input, signal }) => createLogSubscriptionIterator(resources, context, input.levels, signal)),
  };
}
