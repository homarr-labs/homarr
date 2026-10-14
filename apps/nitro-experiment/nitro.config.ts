import { randomUUID } from "node:crypto";
import { defineConfig } from "nitro";

export default defineConfig({
  preset: "bun",
  runtimeConfig: { fixtureBuildId: process.env.NITRO_FIXTURE_BUILD_ID ?? randomUUID() },
  experimental: { database: true },
  database: {
    default: { connector: "bun-sqlite", options: { name: ":memory:" } },
    fixture: {
      connector: "bun-sqlite",
      options: { path: ".fixture-data/fixture.sqlite" },
    },
  },
  plugins: ["./server/plugins/fixture.ts"],
  handlers: [
    { route: "/rpc/**", handler: "./server/routes/rpc.ts" },
    { route: "/api/**", handler: "./server/routes/rest.ts" },
    { route: "/openapi.json", handler: "./server/routes/openapi.ts" },
    { route: "/api-docs", handler: "./server/routes/api-docs.ts" },
    { route: "/fixture/source", handler: "./server/routes/source.ts" },
    { route: "/fixture/source/control", handler: "./server/routes/source-control.ts" },
  ],
});
