// Importing env files here to validate on build
import "./src/env.mjs";
import "@homarr/auth/env.mjs";

/** @type {import("next").NextConfig} */
const config = {
  output: "standalone",
  reactStrictMode: true,
  /** We already do linting and typechecking as separate tasks in CI */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: {
    optimizePackageImports: ["@mantine/core", "@mantine/hooks", "@tabler/icons-react"],
  },
  transpilePackages: ["@homarr/ui", "@homarr/notifications", "@homarr/modals", "@homarr/spotlight", "@homarr/widgets"],
  images: {
    domains: ["cdn.jsdelivr.net"],
  },
};

export default config;
