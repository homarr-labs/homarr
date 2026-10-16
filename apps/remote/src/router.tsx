import { createRouter } from "@tanstack/react-router";
import { appBasePath } from "./lib/base-path";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    basepath: appBasePath,
    defaultPreload: "intent",
    scrollRestoration: true,
    defaultPendingComponent: () => <p className="loading-message">Opening your Homarr…</p>,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
