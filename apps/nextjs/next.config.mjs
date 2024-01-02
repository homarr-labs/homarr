// Importing env files here to validate on build
import "./src/env.mjs";
import "@homarr/auth/env.mjs";

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  /** Enables hot reloading for local packages without a build step */
  transpilePackages: [
    "@homarr/api",
    "@homarr/auth",
    "@homarr/db",
    "@homarr/ui",
    "@homarr/validation",
    "@homarr/form",
    "@homarr/notifications",
    "@homarr/spotlight",
  ],
  /** We already do linting and typechecking as separate tasks in CI */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: {
    optimizePackageImports: [
      "@mantine/core",
      "@mantine/hooks",
      "@mantine/dates",
      "@mantine/notifications",
      "@mantine/form",
      "@mantine/spotlight",
    ],
  },
};

export default config;
