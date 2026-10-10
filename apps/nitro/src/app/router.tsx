import { QueryClient, dehydrate, hydrate } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";

import type { ProviderContributions } from "../contracts/providers";
import type { Bootstrap } from "../contracts/render";
import type { AccessDecision, AccessRequirement } from "../contracts/request";
import { routeTree } from "../route-tree.gen";

export interface RouterContext {
  readonly bootstrap: Bootstrap;
  readonly queryClient: QueryClient;
  readonly providers: ProviderContributions;
  authorize(requirement: AccessRequirement): Promise<AccessDecision>;
}

export class AccessDeniedError extends Error {
  readonly status: 401 | 403;
  constructor(status: 401 | 403) {
    super("Access denied");
    this.status = status;
  }
}

export function createAppRouter(context: Omit<RouterContext, "queryClient">) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0, refetchOnWindowFocus: false } },
  });
  return createRouter({
    routeTree,
    context: { ...context, queryClient },
    defaultPreload: "intent",
    defaultPendingMs: 100,
    dehydrate: () => ({
      publicQueryState: JSON.stringify(
        dehydrate(queryClient, {
          shouldDehydrateQuery: (query) => query.state.status === "success" && query.meta?.visibility === "public",
          shouldDehydrateMutation: () => false,
        }),
      ),
    }),
    hydrate: (state) => {
      hydrate(queryClient, JSON.parse(state.publicQueryState));
    },
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
