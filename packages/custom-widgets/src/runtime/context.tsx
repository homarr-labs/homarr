"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";

import type { CustomWidgetRuntimeValue } from "./types";

const RuntimeContext = createContext<CustomWidgetRuntimeValue | null>(null);

export function CustomWidgetRuntimeProvider({
  children,
  ...value
}: CustomWidgetRuntimeValue & { children: ReactNode }) {
  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

export function useCustomWidgetRuntime(): CustomWidgetRuntimeValue {
  const value = useContext(RuntimeContext);
  if (!value) throw new Error("Custom Widget runtime components require CustomWidgetRuntimeProvider");
  return value;
}

export function useWidgetDefinitionId(): string {
  return useCustomWidgetRuntime().definitionId ?? "";
}
