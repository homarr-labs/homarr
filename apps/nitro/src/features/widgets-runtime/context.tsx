import { createContext, useContext } from "react";
import type { PropsWithChildren } from "react";
import type { QueryKey } from "@tanstack/react-query";

import type { WidgetRpcClient } from "./transport";

export interface WidgetTransportContextValue {
  client: WidgetRpcClient;
  cacheScope: string;
}

export interface WidgetQueryScopeValue {
  polling: boolean;
  record: (key: QueryKey) => void;
  register: (key: QueryKey) => () => void;
}

const WidgetTransportContext = createContext<WidgetTransportContextValue | null>(null);
export const WidgetQueryScopeContext = createContext<WidgetQueryScopeValue | null>(null);

export function WidgetTransportProvider({ children, ...value }: PropsWithChildren<WidgetTransportContextValue>) {
  if (!value.cacheScope.trim()) throw new Error("Widget queries require an authority cache scope");
  return <WidgetTransportContext.Provider value={value}>{children}</WidgetTransportContext.Provider>;
}

export function useWidgetTransport() {
  const value = useContext(WidgetTransportContext);
  if (!value) throw new Error("WidgetTransportProvider is required");
  return value;
}
