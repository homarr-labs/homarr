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

const developmentServicePackages = ["@homarr/tasks", "@homarr/websocket"] as const;
const isQaStandaloneBuild = process.env.HOMARR_QA_STANDALONE_BUILD === "true";

const getDevelopmentServiceAliases = (target: string) => {
  if (process.env.NODE_ENV !== "development" && !isQaStandaloneBuild) {
    return undefined;
  }

  return Object.fromEntries(developmentServicePackages.map((packageName) => [packageName, target]));
};

const getDistDir = () => {
  const qaDistDir = process.env.HOMARR_QA_NEXT_DIST_DIR;
  if (!qaDistDir) return ".next";
  if (!/^\.next-qa\/(?:slot-[1-3]|release-v2-[0-9a-f]{40})$/u.test(qaDistDir)) {
    throw new Error("HOMARR_QA_NEXT_DIST_DIR must identify a QA slot or candidate-pinned release-v2 build");
  }
  return qaDistDir;
};

const nextConfig: NextConfig = {
  // Next previews otherwise create agent instruction files in the application
  // directory during development.
  agentRules: false,
  // Release-v2 QA runs multiple isolated development servers from one worktree.
  distDir: getDistDir(),
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
    // Development and the isolated QA standalone build do not embed tasks or WebSocket.
    // These aliases keep their production-only instrumentation imports out of those graphs.
    resolveAlias: getDevelopmentServiceAliases("./src/instrumentation-noop.ts"),
  },
  webpack(config, { dev, isServer }) {
    if ((!dev && !isQaStandaloneBuild) || !isServer) return config;

    const instrumentationNoopPath = path.resolve(import.meta.dirname, "src/instrumentation-noop.ts");
    const aliases = getDevelopmentServiceAliases(instrumentationNoopPath);
    if (!aliases) return config;

    config.resolve.alias = {
      ...config.resolve.alias,
      ...aliases,
      "./instrumentation-node": instrumentationNoopPath,
    };
    return config;
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
