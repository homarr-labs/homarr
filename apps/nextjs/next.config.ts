// Importing env files here to validate on build
import path from "node:path";

import "@homarr/auth/env";
import "@homarr/core/infrastructure/db/env";
import "@homarr/common/env";
import "@homarr/core/infrastructure/logs/env";
import "@homarr/docker/env";

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Package path does not work... so we need to use relative path
const withNextIntl = createNextIntlPlugin({
  requestConfig: "../../packages/translation/src/request.ts",
});

/**
 * Profiling build. React's production bundle strips the hooks React DevTools needs,
 * which is why the Profiler tab reports "Profiling not supported"; the profiling
 * variant keeps them. Source maps are emitted alongside so heap snapshots and flame
 * charts show real component names instead of minified ones like `y`.
 *
 * Build with:
 *   docker build --build-arg HOMARR_PROFILING=true . -t homarr:performance
 *
 * `reactProductionProfiling` in this config is only read by the webpack path — under
 * Turbopack it comes from `next build --profile`, which apps/nextjs/package.json
 * passes when HOMARR_PROFILING=true. Both are set so either bundler works.
 *
 * Off by default: the profiling variant is slower and source maps are large, so this
 * must never be what ships to users.
 */
const isProfilingBuild = process.env.HOMARR_PROFILING === "true";

const nextConfig: NextConfig = {
  reactProductionProfiling: isProfilingBuild,
  productionBrowserSourceMaps: isProfilingBuild,
  // Next previews otherwise create agent instruction files in the application
  // directory during development.
  agentRules: false,
  env: {
    HOMARR_VERSION: process.env.HOMARR_VERSION ?? "unknown",
  },
  output: "standalone",
  reactStrictMode: true,
  // react compiler breaks mantine-react-table, so disabled for now
  //reactCompiler: true,
  /** We already do typechecking as separate tasks in CI */
  typescript: { ignoreBuildErrors: true },
  /**
   * dockerode is required in the external server packages because of https://github.com/homarr-labs/homarr/issues/612
   *
   * Everything else here is a server-only dependency that is cheaper left as a
   * runtime require than inlined into the server bundle. Bundling pulls a package's
   * whole transitive graph into a chunk that is loaded and compiled at boot even
   * when the code path never runs — measurably so for the DB drivers: only
   * better-sqlite3 is ever used, yet inlining mysql2 and pg cost ~21 MiB of
   * resident memory at idle.
   */
  serverExternalPackages: [
    "dockerode",
    "better-sqlite3",
    "mysql2",
    "pg",
    "winston",
    "drizzle-orm",
    "ical.js",
    "jszip",
    "ldapts",
    "node-unifi",
    "@kubernetes/client-node",
    "linkedom",
    // Only reachable through /api/mcp/[transport].
    "@modelcontextprotocol/sdk",
  ],
  experimental: {
    optimizePackageImports: ["@mantine/core", "@mantine/hooks", "@tabler/icons-react"],
    turbopackFileSystemCacheForBuild: true,
    useTypeScriptCli: true,
  },
  turbopack: {
    root: path.resolve(import.meta.dirname, "../.."),
    resolveAlias:
      process.env.NODE_ENV === "development"
        ? {
            "@homarr/tasks": path.resolve(import.meta.dirname, "src/instrumentation-noop.ts"),
            "@homarr/websocket": path.resolve(import.meta.dirname, "src/instrumentation-noop.ts"),
          }
        : {},
  },
  transpilePackages: ["@homarr/ui", "@homarr/notifications", "@homarr/modals", "@homarr/spotlight", "@homarr/widgets"],
  images: {
    localPatterns: [
      {
        pathname: "/**",
        search: "",
      },
    ],
  },
  // skipcq: JS-0116
  // eslint-disable-next-line @typescript-eslint/require-await,no-restricted-syntax
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
      {
        source: "/(.*)", // Apply CSP to all routes
        headers: [
          {
            key: "Content-Security-Policy",
            // worker-src / media-src with blob: is necessary for video.js, see https://github.com/homarr-labs/homarr/issues/3912 and https://stackoverflow.com/questions/65792855/problem-with-video-js-and-content-security-policy-csp
            value: `
              default-src 'self';
              script-src * 'unsafe-inline' 'unsafe-eval';
              worker-src * blob:;
              base-uri 'self';
              connect-src *;
              style-src * 'unsafe-inline'; 
              frame-ancestors *;
              frame-src *;
              form-action 'self';
              img-src * data:;
              font-src * data:;
              media-src * data: blob:;
            `
              .replace(/\s{2,}/g, " ")
              .trim(),
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
