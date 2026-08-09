"use client";

import { createContext, useContext } from "react";

import type { AssistantReasoningMode, AssistantRuntimeModelOption } from "./assistant-preferences";

/**
 * Context and hooks live in their own module so that consumers such as the user menu can read the
 * assistant state without pulling in `assistant-provider`, which statically imports the
 * assistant-ui runtime, the Lexical composer, the Markdown renderer and Mermaid. Importing those
 * from a component that renders on every page would ship them to every page.
 */
export interface AssistantContextValue {
  enabled: boolean;
  unavailableDescription: string | null;
  opened: boolean;
  isRunning: boolean;
  isRefreshing: boolean;
  unreadCount: number;
  open: () => void;
  close: () => void;
  toggle: () => void;
  sendPrompt: (prompt: string) => boolean;
  refreshCurrentView: () => Promise<void>;
}

export const AssistantContext = createContext<AssistantContextValue | null>(null);

export interface AssistantPreferencesContextValue {
  defaultModelId: string | null;
  modelId: string | null;
  models: AssistantRuntimeModelOption[];
  reasoning: AssistantReasoningMode;
  isLoading: boolean;
  setModelId: (modelId: string) => void;
  setReasoning: (reasoning: AssistantReasoningMode) => void;
  getRequestBody: () => { modelId?: string; reasoning: AssistantReasoningMode };
}

export const AssistantPreferencesContext = createContext<AssistantPreferencesContextValue | null>(null);

export const useHomarrAssistant = () => {
  const value = useContext(AssistantContext);
  if (!value) {
    throw new Error("useHomarrAssistant must be used within AssistantProvider");
  }
  return value;
};

export const useOptionalHomarrAssistant = () => useContext(AssistantContext);

export const useAssistantPreferences = () => {
  const value = useContext(AssistantPreferencesContext);
  if (!value) throw new Error("useAssistantPreferences must be used within AssistantPreferencesProvider");
  return value;
};
