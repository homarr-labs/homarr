// Importing env files here to validate on build
import "@homarr/auth/env.mjs";
import "./src/env.mjs";

/** @type {import("next").NextConfig} */
const config = {
  output: "standalone",
  reactStrictMode: true,
  /** We already do linting and typechecking as separate tasks in CI */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  webpack: (config) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    config.module.rules.push({
      test: /\.node$/,
      loader: "node-loader",
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return config;
  },
  experimental: {
    optimizePackageImports: [
      "@mantine/core",
      "@mantine/hooks",
      "@tabler/icons-react",
    ],
  },
  transpilePackages: [
    "@homarr/ui",
    "@homarr/notifications",
    "@homarr/modals",
    "@homarr/spotlight",
    "@homarr/widgets",
  ],
  images: {
    domains: ["cdn.jsdelivr.net"],
  },
};

export default config;
