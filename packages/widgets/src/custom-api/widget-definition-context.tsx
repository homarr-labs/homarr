"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";

const WidgetDefinitionContext = createContext<string>("");

export function WidgetDefinitionProvider({ definitionId, children }: { definitionId: string; children: ReactNode }) {
  return <WidgetDefinitionContext.Provider value={definitionId}>{children}</WidgetDefinitionContext.Provider>;
}

export function useWidgetDefinitionId(): string {
  return useContext(WidgetDefinitionContext);
}
