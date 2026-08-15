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

const getDevelopmentServiceAliases = () => {
  if (process.env.NODE_ENV !== "development") {
    return undefined;
  }

  return {
    "@homarr/tasks": "./src/instrumentation-noop.ts",
    "@homarr/websocket": "./src/instrumentation-noop.ts",
  };
};

const nextConfig: NextConfig = {
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
   * isomorphic-dompurify and jsdom are required, see https://github.com/kkomelin/isomorphic-dompurify/issues/356
   */
  serverExternalPackages: ["dockerode", "isomorphic-dompurify", "jsdom", "better-sqlite3"],
  experimental: {
    optimizePackageImports: ["@mantine/core", "@mantine/hooks", "@tabler/icons-react"],
    preloadEntriesOnStart: true,
    turbopackFileSystemCacheForBuild: true,
    useTypeScriptCli: true,
  },
  turbopack: {
    root: path.resolve(import.meta.dirname, "../.."),
    // Development runs tasks and WebSocket as separate processes. These aliases
    // keep their production-only instrumentation imports out of the dev graph.
    resolveAlias: getDevelopmentServiceAliases(),
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
            key: "Accept-CH",
            value: "Sec-CH-Viewport-Width",
          },
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
