import { createContext, useContext } from "react";
import type { PropsWithChildren } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { ExpansionQueryScope } from "../../query/types";

const GeneratedWidgetContext = createContext<ExpansionQueryScope | null>(null);

export interface GeneratedWidgetProviderProps {
  queryScope: ExpansionQueryScope;
}

export function GeneratedWidgetProvider({ queryScope, children }: PropsWithChildren<GeneratedWidgetProviderProps>) {
  const queryClient = useQueryClient();
  if (queryClient !== queryScope.queryClient) throw new Error("Widget queries require their owning QueryClient");
  queryScope.assertCurrent();
  return <GeneratedWidgetContext.Provider value={queryScope}>{children}</GeneratedWidgetContext.Provider>;
}

export function useGeneratedWidgetScope() {
  const scope = useContext(GeneratedWidgetContext);
  const queryClient = useQueryClient();
  if (!scope) throw new Error("GeneratedWidgetProvider is required");
  if (scope.queryClient !== queryClient) throw new Error("Widget queries require their owning QueryClient");
  scope.assertCurrent();
  return scope;
}
