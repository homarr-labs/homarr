import { z } from "zod/v4";

import { findIconsAsync } from "@homarr/icons";
import { iconsFindSchema } from "@homarr/validation/icons";

import { backendContractRevision } from "../context";
import { defineBackendContribution } from "../contribution";
import { sourceProcedure, sourceProjectionMeta } from "../procedure";
import type { IconProcedureResources } from "./-icons/resources";

export type { IconProcedureResources } from "./-icons/resources";
export const iconImplementedPaths = ["icon.findIcons"] as const;
export const iconPendingPaths = [] as const;
export const iconSourceBindings = [
  { path: "icon.findIcons", sourceFile: "packages/api/src/router/icons.ts", status: "native" },
] as const;

export const createIconProcedures = (resources: IconProcedureResources) => ({
  findIcons: sourceProcedure({ path: "icon.findIcons", kind: "query", access: { kind: "public" }, demo: "guarded" })
    .meta(
      sourceProjectionMeta({
        mcp: {
          enabled: true,
          description:
            "Search for icons by name across all icon repositories. Returns matching icon names and exact image URLs; use those URLs directly for app icons and Markdown image previews. OPTIONAL: searchText (string to filter), limitPerGroup (number 1-500, default 12). Call with no arguments to browse all icons",
        },
      }),
    )
    .input(iconsFindSchema)
    .output(
      z.object({
        icons: z.array(
          z.object({
            id: z.string(),
            slug: z.string(),
            icons: z.array(z.object({ id: z.string(), name: z.string(), url: z.string() })),
          }),
        ),
        countIcons: z.number(),
      }),
    )
    .handler(({ context, input }) => {
      context.signal.throwIfAborted();
      return resources.runReadAsync(context, async (scope) => {
        context.signal.throwIfAborted();
        const result = await findIconsAsync(scope, input, context.signal);
        context.signal.throwIfAborted();
        return result;
      });
    }),
});

export const createIconContribution = (resources: IconProcedureResources) =>
  defineBackendContribution({
    revision: backendContractRevision,
    id: "icons.source-port.v1",
    router: { icon: createIconProcedures(resources) },
    leaves: iconImplementedPaths,
  });
