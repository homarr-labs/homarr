import { z } from "zod/v4";

import { authenticatedProcedure, sourceProcedure, sourceProjectionMeta } from "../procedure";

export function createInfoProcedures(version: string) {
  return {
    getInfo: authenticatedProcedure({
      path: "info.getInfo",
      kind: "query",
      access: { kind: "protected" },
      demo: "guarded",
    })
      .meta(
        sourceProjectionMeta({
          openapi: {
            method: "GET",
            path: "/api/info",
            tags: ["info"],
            protect: true,
            summary: "Get server information",
            description: "Return the Homarr server version. Requires authentication.",
          },
          mcp: { enabled: true, description: "Get Homarr server version information" },
        }),
      )
      .input(z.void())
      .output(z.object({ version: z.string() }))
      .handler(() => ({ version })),
    isDemoMode: sourceProcedure({
      path: "info.isDemoMode",
      kind: "query",
      access: { kind: "public" },
      demo: "guarded",
    }).handler(({ context }) => context.demo.enabled),
    isDemoReadOnly: sourceProcedure({
      path: "info.isDemoReadOnly",
      kind: "query",
      access: { kind: "public" },
      demo: "guarded",
    }).handler(({ context }) => context.demo.enabled && context.demo.readOnly),
  };
}
