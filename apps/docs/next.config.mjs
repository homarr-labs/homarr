import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import("next").NextConfig} */
const config = {
  output: "export",
  reactStrictMode: true,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  transpilePackages: ["@homarr/custom-widgets", "@homarr/definitions", "@homarr/workshop"],
};

export default withMDX(config);
