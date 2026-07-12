"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";

export interface CustomJsxRuntimeContextValue {
  /** The placed board item used for all authorization decisions. */
  itemId?: string;
  /** Kept temporarily for display-only v1 templates. Never used for network authorization. */
  definitionId?: string;
  /** Short-lived, user-bound session used only by the admin authoring preview. */
  previewSessionId?: string;
  previewLiveActions?: boolean;
  isEditMode: boolean;
  requestCapabilities?: readonly CustomJsxRequestCapability[];
}

export interface CustomJsxRequestCapability {
  id: string;
  kind: "query" | "action";
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  minimumBoardPermission: "view" | "modify" | "full";
}

const CustomJsxRuntimeContext = createContext<CustomJsxRuntimeContextValue>({ isEditMode: false });

export function WidgetDefinitionProvider({
  itemId,
  definitionId,
  previewSessionId,
  previewLiveActions = false,
  isEditMode = false,
  requestCapabilities = [],
  children,
}: CustomJsxRuntimeContextValue & { children: ReactNode }) {
  return (
    <CustomJsxRuntimeContext.Provider
      value={{ itemId, definitionId, previewSessionId, previewLiveActions, isEditMode, requestCapabilities }}
    >
      {children}
    </CustomJsxRuntimeContext.Provider>
  );
}

export function useWidgetDefinitionId(): string {
  return useContext(CustomJsxRuntimeContext).definitionId ?? "";
}

export function useCustomJsxRuntime(): CustomJsxRuntimeContextValue {
  return useContext(CustomJsxRuntimeContext);
}
