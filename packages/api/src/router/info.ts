import z from "zod/v4";

import { HOMARR_CAPABILITY_GUIDANCE } from "../mcp-capabilities";

import packageJson from "../../../../package.json";
import { createTRPCRouter, isDemoMode, isDemoReadOnly, publicProcedure, protectedProcedure } from "../trpc";

export const infoRouter = createTRPCRouter({
  capabilities: protectedProcedure
    .input(z.void())
    .meta({
      mcp: {
        enabled: true,
        description:
          "Start here when asked what Homarr can do. Discover its most powerful tool, integration_request: call any API endpoint on supported saved integrations, including features beyond native Homarr widgets and tools, then expose data or actions through Custom Widgets.",
      },
    })
    .query(() => ({
      overview: HOMARR_CAPABILITY_GUIDANCE,
      nativeCapabilities: [
        "Manage boards, apps, widgets, and integrations.",
        "Read service data and perform service actions with the available tools.",
        "Author Custom Widgets and administer Homarr where permissions allow.",
      ],
      discovery:
        "Use the live tool catalog and integration_all to discover available operations and configured services. Tool permissions and request limits still apply.",
    })),
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
