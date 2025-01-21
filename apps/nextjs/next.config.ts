// Importing env files here to validate on build
import "@homarr/auth/env";
import "@homarr/db/env";
import "@homarr/common/env";
import "@homarr/docker/env";

import type { NextConfig } from "next";
import MillionLint from "@million/lint";
import createNextIntlPlugin from "next-intl/plugin";

import "./src/env.ts";

// Package path does not work... so we need to use relative path
const withNextIntl = createNextIntlPlugin("../../packages/translation/src/request.ts");

interface WebpackConfig {
  module: {
    rules: {
      test: RegExp;
      loader: string;
    }[];
  };
}

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  /** We already do linting and typechecking as separate tasks in CI */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  webpack: (config: WebpackConfig, { isServer }) => {
    if (isServer) {
      config.module.rules.push({
        test: /\.node$/,
        loader: "node-loader",
      });
    }

    return config;
  },
  experimental: {
    optimizePackageImports: ["@mantine/core", "@mantine/hooks", "@tabler/icons-react"],
  },
  transpilePackages: ["@homarr/ui", "@homarr/notifications", "@homarr/modals", "@homarr/spotlight", "@homarr/widgets"],
  images: {
    domains: ["cdn.jsdelivr.net"],
  },
};

// Skip transform is used because of webpack loader, without it for example 'Tooltip.Floating' will not work and show an error
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const withMillionLint = MillionLint.next({ rsc: true, skipTransform: true, telemetry: false });

export default withNextIntl(nextConfig);
