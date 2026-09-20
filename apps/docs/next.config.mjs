import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import("next").NextConfig} */
const config = {
  output: "export",
  allowedDevOrigins: ["127.0.0.1", "100.71.78.45"],
  reactStrictMode: true,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  transpilePackages: ["@homarr/custom-widgets", "@homarr/definitions", "@homarr/ui", "@homarr/workshop"],
};

export default withMDX(config);
