// Importing env files here to validate on build
import "@homarr/auth/env.mjs";
import MillionLint from "@million/lint";
import "./src/env.mjs";

/** @type {import("next").NextConfig} */
const config = {
  output: "standalone",
  reactStrictMode: true,
  /** We already do linting and typechecking as separate tasks in CI */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  webpack: (config, { isServer }) => {
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

export default MillionLint.next({ rsc: true })(config);
