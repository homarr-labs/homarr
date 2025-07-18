// Importing env files here to validate on build
import "@homarr/auth/env";
import "@homarr/db/env";
import "@homarr/common/env";
import "@homarr/log/env";
import "@homarr/docker/env";

import type { NextConfig } from "next";
import MillionLint from "@million/lint";
import createNextIntlPlugin from "next-intl/plugin";

// Package path does not work... so we need to use relative path
const withNextIntl = createNextIntlPlugin({
  experimental: {
    createMessagesDeclaration: "../../packages/translation/src/lang/en.json",
  },
  requestConfig: "../../packages/translation/src/request.ts",
});

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  /** We already do linting and typechecking as separate tasks in CI */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  /**
   * dockerode is required in the external server packages because of https://github.com/homarr-labs/homarr/issues/612
   */
  serverExternalPackages: ["dockerode"],
  experimental: {
    optimizePackageImports: ["@mantine/core", "@mantine/hooks", "@tabler/icons-react"],
  },
  transpilePackages: ["@homarr/ui", "@homarr/notifications", "@homarr/modals", "@homarr/spotlight", "@homarr/widgets"],
  images: {
    domains: ["cdn.jsdelivr.net"],
  },
  // eslint-disable-next-line @typescript-eslint/require-await,no-restricted-syntax
  async headers() {
    return [
      {
        source: "/(.*)", // Apply CSP to all routes
        headers: [
          {
            key: "Content-Security-Policy",
            value: `
              default-src 'self';
              script-src * 'unsafe-inline' 'unsafe-eval';
              base-uri 'self';
              connect-src *;
              style-src * 'unsafe-inline'; 
              frame-ancestors *;
              frame-src *;
              form-action 'self';
              img-src * data:;
              font-src * data:;
              media-src * data:;
            `
              .replace(/\s{2,}/g, " ")
              .trim(),
          },
        ],
      },
    ];
  },
};

// Skip transform is used because of webpack loader, without it for example 'Tooltip.Floating' will not work and show an error
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const withMillionLint = MillionLint.next({ rsc: true, skipTransform: true, telemetry: false });

export default withNextIntl(nextConfig);
