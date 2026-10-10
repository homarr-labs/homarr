import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { createNitro } from "nitro/builder";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import type { UserConfig } from "vite";

export default defineConfig(
  async ({ command }): Promise<UserConfig> => ({
    envDir: false,
    plugins: [
      tanstackRouter({
        target: "react",
        routesDirectory: "./src/routes",
        generatedRouteTree: "./src/route-tree.gen.ts",
        routeFileIgnorePrefix: "-",
        routeTreeFileHeader: [],
        quoteStyle: "double",
        semicolons: true,
        autoCodeSplitting: false,
      }),
      nitro({
        _nitro: await createNitro(
          {
            rootDir: import.meta.dirname,
            dev: command === "serve",
            builder: "vite",
          },
          { dotenv: false },
        ),
      }),
      react(),
    ],
    server: { host: "127.0.0.1", port: 3200, strictPort: true },
    environments: {
      ssr: {
        build: {
          rollupOptions: {
            input: "./src/entry-server.tsx",
            external: [/\/nitro\/src\/server\//],
            makeAbsoluteExternalsRelative: false,
          },
        },
      },
      client: { build: { rollupOptions: { input: "./src/entry-client.tsx" } } },
    },
  }),
);
