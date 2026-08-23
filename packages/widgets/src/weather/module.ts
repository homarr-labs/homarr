import { defineWidgetModule } from "@homarr/definitions";

export default defineWidgetModule({
  kind: "weather",
  icon: "IconCloud",
  clientEntry: ".",
  documentation: {
    slug: "weather",
    sourceDirectory: "docs",
  },
  defaultSize: { width: 2, height: 1 },
  operations: [
    {
      name: "atLocation",
      path: ["widget", "weather", "atLocation"],
      client: {
        refetchIntervalSeconds: 600,
        staleTimeSeconds: 300,
        persist: true,
      },
      serverCache: {
        namespace: "weather:at-location",
        ttlMs: 5 * 60 * 1000,
        scope: "shared",
      },
    },
  ],
  routers: [
    {
      namespace: "weather",
      module: "./weather",
      exportName: "weatherRouter",
      additionalWidgetKinds: ["clock"],
    },
  ],
});
