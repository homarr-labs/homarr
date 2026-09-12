"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { CustomWidgetQueryObserver } from "./execution-observer";

const ExecutionObserverContext = createContext<CustomWidgetQueryObserver | undefined>(undefined);
export const useCustomWidgetQueryObserver = () => useContext(ExecutionObserverContext);
export function CustomWidgetExecutionObserverProvider({
  observer,
  children,
}: {
  observer: CustomWidgetQueryObserver;
  children: ReactNode;
}) {
  return <ExecutionObserverContext.Provider value={observer}>{children}</ExecutionObserverContext.Provider>;
}
