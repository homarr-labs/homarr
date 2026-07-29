// Importing env files here to validate on build
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

const nextConfig: NextConfig = {
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
    turbopackFileSystemCacheForDev: true,
    webpackMemoryOptimizations: true,
  },
  turbopack: {
    // ponytail: known Turbopack NFT warning from path.join(process.cwd(), …) in
    // src/app/api/backup/{route,shared}.ts. No working placement in 16.2.x
    // (see vercel/next.js#95125). Suppress until upstream fix lands.
    ignoreIssue: [
      {
        path: "**/*",
        title: "Encountered unexpected file in NFT list",
      },
    ],
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
