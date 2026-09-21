import z from "zod/v4";

import packageJson from "../../../../package.json";
import { createTRPCRouter, isDemoMode, isDemoReadOnly, publicProcedure, protectedProcedure } from "../trpc";

export const infoRouter = createTRPCRouter({
  getInfo: protectedProcedure
    .input(z.void())
    .output(z.object({ version: z.string() }))
    .meta({
      openapi: { method: "GET", path: "/api/info", tags: ["info"] },
      mcp: {
        enabled: true,
        description: "Get Homarr server version information",
      },
    })
    .query(() => {
      return {
        version: packageJson.version,
      };
    }),
  isDemoMode: publicProcedure.query(() => isDemoMode),
  isDemoReadOnly: publicProcedure.query(() => isDemoReadOnly),
});
