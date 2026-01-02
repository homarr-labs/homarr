import path from "path";

export const externalExceptMonorepoPlugin = {
  name: "external-except-monorepo",
  setup(build) {
    build.onResolve({ filter: /.*/ }, (args) => {
      // Check if it's an internal @homarr package
      if (args.path.startsWith("@homarr/")) {
        return; // Let esbuild bundle internal @homarr packages
      }

      // Check if it's a node_module and not an @homarr package
      if (!path.isAbsolute(args.path) && !args.path.startsWith(".")) {
        return { path: args.path, external: true }; // Mark as external
      }

      return; // Let esbuild handle other resolutions
    });
  },
};
