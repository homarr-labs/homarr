import baseConfig from "@homarr/eslint-config/base";
import reactConfig from "@homarr/eslint-config/react";
import nextConfig from "@homarr/eslint-config/nextjs";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [],
  },
  ...baseConfig,
  ...reactConfig,
  ...nextConfig,
];