import type { QueryClient, QueryFilters } from "@tanstack/react-query";

export type ClientEffect =
  | { readonly kind: "query-refresh"; readonly filters: QueryFilters }
  | { readonly kind: "loader-refresh" }
  | { readonly kind: "render-revision"; readonly revision: string }
  | { readonly kind: "session-change" }
  | { readonly kind: "resource-policy-change"; readonly resource: string; readonly capturedEpoch: number };

export interface RefreshPorts {
  readonly queryClient: QueryClient;
  invalidateLoaders(): Promise<void>;
  refreshRenderSnapshot(revision: string): Promise<void>;
  resolveSession(): Promise<void>;
  invalidateResourcePolicy(resource: string): Promise<void>;
}
