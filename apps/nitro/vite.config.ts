import { lstat, mkdir, realpath } from "node:fs/promises";
import { dirname, isAbsolute, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { createNitro } from "nitro/builder";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import type { UserConfig } from "vite";

function containsPath(directory: string, target: string): boolean {
  const path = relative(directory, target);
  return path === "" || (!isAbsolute(path) && path !== ".." && !path.startsWith(`..${sep}`));
}

async function assertDirectoryAncestors(path: string, allowMissing: boolean): Promise<void> {
  let ancestor = path;
  for (;;) {
    try {
      const entry = await lstat(ancestor);
      if (entry.isSymbolicLink() || !entry.isDirectory()) {
        throw new Error("Nitro build and data directory ancestors must be physical directories");
      }
    } catch (error) {
      if (!allowMissing || !(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
        throw error;
      }
    }
    const parent = dirname(ancestor);
    if (parent === ancestor) return;
    ancestor = parent;
  }
}

async function createBuildPaths() {
  if (process.env.HOMARR_NITRO_ACTIVATION !== "accepted") {
    throw new Error("Nitro candidate build requires explicit accepted activation");
  }
  const root = process.env.HOMARR_NITRO_BUILD_ROOT;
  if (!root || !isAbsolute(root) || normalize(root) !== root || /[\r\n]/u.test(root)) {
    throw new Error("HOMARR_NITRO_BUILD_ROOT must be an explicit normalized absolute path");
  }
  const repository = await realpath(resolve(import.meta.dirname, "../.."));
  const protectedDirectories = [repository, resolve(import.meta.dirname, "../.."), "/appdata"];
  const databaseUrl = process.env.DB_URL;
  if (databaseUrl && isAbsolute(databaseUrl)) protectedDirectories.push(dirname(databaseUrl));
  for (const name of ["HOMARR_DATA_DIR", "HOMARR_NITRO_DATA_ROOT"]) {
    const directory = process.env[name];
    if (!directory) continue;
    if (!isAbsolute(directory) || normalize(directory) !== directory) {
      throw new Error(`${name} must be a normalized absolute path for an isolated build`);
    }
    protectedDirectories.push(directory);
  }
  for (const directory of protectedDirectories) {
    if (containsPath(directory, root) || containsPath(root, directory)) {
      throw new Error("Nitro build root must be disjoint from the checkout and data directories");
    }
    await assertDirectoryAncestors(directory, true);
  }
  await assertDirectoryAncestors(dirname(root), false);
  await mkdir(root, { mode: 0o700 });
  return {
    root,
    repository,
    build: resolve(root, "build"),
    cache: resolve(root, "vite-cache"),
    router: resolve(root, "router-tmp"),
    publicBuild: resolve(root, "build/vite/public"),
    artifact: resolve(root, "artifact"),
    server: resolve(root, "artifact/server"),
    publicAssets: resolve(root, "artifact/public"),
  };
}

export default defineConfig(async ({ command }): Promise<UserConfig> => {
  let paths: Awaited<ReturnType<typeof createBuildPaths>> | undefined;
  if (command === "build") paths = await createBuildPaths();

  return {
    root: import.meta.dirname,
    envDir: false,
    ...(paths && { cacheDir: paths.cache, build: { outDir: paths.publicBuild } }),
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
        enableRouteGeneration: command === "serve",
        ...(paths && { tmpDir: paths.router }),
      }),
      nitro({
        _nitro: await createNitro(
          {
            rootDir: import.meta.dirname,
            dev: command === "serve",
            builder: "vite",
            ...(paths && {
              rootDir: paths.root,
              workspaceDir: paths.repository,
              scanDirs: [import.meta.dirname],
              buildDir: paths.build,
              output: { dir: paths.artifact, serverDir: paths.server, publicDir: paths.publicAssets },
            }),
          },
          {
            dotenv: false,
            c12: { configFile: fileURLToPath(new URL("../backend/nitro.config.ts", import.meta.url)) },
          },
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
            external: [/\/backend\/src\/server\//],
            makeAbsoluteExternalsRelative: false,
          },
        },
      },
      client: { build: { rollupOptions: { input: "./src/entry-client.tsx" } } },
      nitro: {
        resolve: {
          dedupe: [
            "@dnd-kit/dom",
            "@dnd-kit/react",
            "@mantine/core",
            "@mantine/dropzone",
            "@mantine/hooks",
            "@mantine/notifications",
            "@paralleldrive/cuid2",
            "@tabler/icons-react",
            "@tanstack/react-query",
            "@tanstack/react-router",
            "clsx",
            "cookie",
            "crypto-js",
            "dayjs",
            "deepmerge",
            "jotai",
            "react",
            "react-dom",
            "use-intl",
            "zod",
          ],
        },
      },
    },
  };
});
