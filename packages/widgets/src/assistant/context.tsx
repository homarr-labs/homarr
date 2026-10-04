"use client";

import type { ComponentType, PropsWithChildren } from "react";
import { createContext, useContext } from "react";

import type { WidgetComponentProps } from "../definition";

type AssistantWidgetRenderer = ComponentType<WidgetComponentProps<"assistant">>;

const AssistantWidgetRendererContext = createContext<AssistantWidgetRenderer | null>(null);

interface AssistantWidgetRendererProviderProps extends PropsWithChildren {
  renderer: AssistantWidgetRenderer;
}

export const AssistantWidgetRendererProvider = ({ children, renderer }: AssistantWidgetRendererProviderProps) => (
  <AssistantWidgetRendererContext.Provider value={renderer}>{children}</AssistantWidgetRendererContext.Provider>
);

export const useAssistantWidgetRenderer = () => useContext(AssistantWidgetRendererContext);
