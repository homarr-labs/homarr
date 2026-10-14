import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useMemo } from "react";

import type { createAppRouter } from "../app/router";
import type { FileRoutesByTo } from "../route-tree.gen";
import { createRouteQueryLoader } from "./query-loader";

export type NavigationRouter = ReturnType<typeof createAppRouter>;
export type InternalDestination = keyof FileRoutesByTo;

export const navigationRouterDefaults = {
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
} satisfies Pick<NavigationRouter["options"], "defaultPreload" | "defaultPreloadStaleTime">;

export function createNavigationOwner(router: NavigationRouter) {
  const queryClient = router.options.context.queryClient;

  return {
    queryClient,
    navigate: router.navigate,
    preloadRoute: router.preloadRoute,
    queries: createRouteQueryLoader(queryClient),
  };
}

export type NavigationOwner = ReturnType<typeof createNavigationOwner>;

export function useNavigationOwner(): NavigationOwner {
  const router = useRouter<NavigationRouter>();
  const queryClient = useQueryClient();
  const owner = useMemo(() => createNavigationOwner(router), [router, queryClient]);

  if (owner.queryClient !== queryClient) {
    throw new Error("Navigation and route components must share the Router context QueryClient");
  }

  return owner;
}
