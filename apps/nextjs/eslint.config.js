import baseConfig from "@homarr/eslint-config/base";
import nextjsConfig from "@homarr/eslint-config/nextjs";
import reactConfig from "@homarr/eslint-config/react";

/** @type {import('typescript-eslint').Config} */
export default [
  {
    ignores: [".next/**"],
  },
  ...baseConfig,
  ...reactConfig,
  ...nextjsConfig,
  {
    files: ["public/sw.js"],
    languageOptions: {
      globals: {
        self: "readonly",
        clients: "readonly",
        skipWaiting: "readonly",
        importScripts: "readonly",
        caches: "readonly",
        fetch: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
    },
  },
];
