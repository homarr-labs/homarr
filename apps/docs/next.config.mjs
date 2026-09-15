import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import("next").NextConfig} */
const config = {
  output: "export",
  allowedDevOrigins: ["127.0.0.1"],
  reactStrictMode: true,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  transpilePackages: ["@homarr/custom-widgets", "@homarr/definitions", "@homarr/workshop"],
};

export default withMDX(config);
