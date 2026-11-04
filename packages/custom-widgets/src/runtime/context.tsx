"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";

import type { CustomWidgetRuntimeValue } from "./types";

const RuntimeContext = createContext<CustomWidgetRuntimeValue | null>(null);

export function CustomWidgetRuntimeProvider({
  children,
  itemId,
  definitionId,
  queryCacheKey,
  previewSessionId,
  previewLiveActions,
  queriesDisabled,
  isEditMode,
  requestCapabilities,
  port,
  messages,
  setQueryState,
}: CustomWidgetRuntimeValue & { children: ReactNode }) {
  const value = useMemo(
    () => ({
      itemId,
      definitionId,
      queryCacheKey,
      previewSessionId,
      previewLiveActions,
      queriesDisabled,
      isEditMode,
      requestCapabilities,
      port,
      messages,
      setQueryState,
    }),
    [
      itemId,
      definitionId,
      queryCacheKey,
      previewSessionId,
      previewLiveActions,
      queriesDisabled,
      isEditMode,
      requestCapabilities,
      port,
      messages,
      setQueryState,
    ],
  );
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
