import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import type { ReactNode } from "react";

import type { ExpansionQueryScope } from "./types";

const expansionQueryContext = createContext<ExpansionQueryScope | null>(null);

export interface ExpansionQueryScopeProviderProps {
  readonly scope: ExpansionQueryScope;
  readonly children: ReactNode;
}

export function ExpansionQueryScopeProvider({ scope, children }: ExpansionQueryScopeProviderProps) {
  scope.assertCurrent();
  return (
    <QueryClientProvider client={scope.queryClient}>
      <expansionQueryContext.Provider value={scope}>{children}</expansionQueryContext.Provider>
    </QueryClientProvider>
  );
}

export function useExpansionQueryScope(): ExpansionQueryScope {
  const scope = useContext(expansionQueryContext);
  const queryClient = useQueryClient();
  if (!scope) throw new Error("Expansion Query consumers require an acquired scope provider");
  if (queryClient !== scope.queryClient) throw new Error("Expansion Query provider ownership changed");
  scope.assertCurrent();
  return scope;
}
