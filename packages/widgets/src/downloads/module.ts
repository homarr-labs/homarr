import { defineWidgetModule } from "@homarr/definitions";

export default defineWidgetModule({
  kind: "downloads",
  icon: "IconDownload",
  clientEntry: ".",
  documentation: {
    slug: "downloads",
    sourceDirectory: "docs",
  },
  integration: {
    categories: ["downloadClient"],
  },
  operations: [
    {
      name: "getJobsAndStatuses",
      path: ["widget", "downloads", "getJobsAndStatuses"],
      client: {
        refetchIntervalSeconds: 10,
        staleTimeSeconds: 10,
        persist: true,
      },
      serverCache: {
        namespace: "downloads:jobs-and-status",
        ttlMs: 10 * 1000,
        scope: "integration",
      },
    },
  ],
  routers: [
    {
      namespace: "downloads",
      module: "./downloads",
      exportName: "downloadsRouter",
      mcp: true,
    },
  ],
});
