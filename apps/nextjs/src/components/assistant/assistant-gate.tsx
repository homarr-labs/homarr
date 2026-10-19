"use client";

import type { PropsWithChildren } from "react";
import { useMemo } from "react";

import { useI18n } from "@homarr/translation/client";
import { AssistantWidgetRendererProvider } from "@homarr/widgets/assistant/context";

import { AssistantContext } from "./assistant-context";
import { AssistantLauncher } from "./assistant-launcher";
import { AssistantBoardWidgetLazy } from "./assistant-widget-lazy";
import { useRegisterAssistantSpotlightPlaceholder } from "./assistant-spotlight-placeholder";

const DisabledAssistant = ({ children, description }: PropsWithChildren<{ description: string }>) => {
  useRegisterAssistantSpotlightPlaceholder(description);
  const value = useMemo(
    () => ({
      enabled: false,
      unavailableDescription: description,
      opened: false,
      isRunning: false,
      isRefreshing: false,
      unreadCount: 0,
      hasVisibleWidget: false,
      activeWidgetId: null,
      open: () => undefined,
      close: () => undefined,
      toggle: () => undefined,
      sendPrompt: () => false,
      refreshCurrentView: () => Promise.resolve(),
      setWidgetVisible: () => undefined,
      activateWidget: () => undefined,
    }),
    [description],
  );

  return (
    <AssistantContext.Provider value={value}>
      <AssistantWidgetRendererProvider renderer={AssistantBoardWidgetLazy}>{children}</AssistantWidgetRendererProvider>
    </AssistantContext.Provider>
  );
};

/**
 * Why the assistant is or is not usable, resolved alongside root-layout data.
 *
 * `unauthenticated` is kept apart from `unconfigured` because the server cannot check availability
 * for a signed-out visitor, and telling them the instance is unconfigured would be a guess.
 */
export type AssistantAvailability = "enabled" | "unconfigured" | "unauthenticated" | "error";

interface AssistantGateProps extends PropsWithChildren {
  availability: AssistantAvailability;
}

const unavailableMessageKeys = {
  unauthenticated: "unavailable.signIn",
  unconfigured: "unavailable.notConfigured",
  error: "unavailable.error",
} as const;

export const AssistantGate = ({ availability, children }: AssistantGateProps) => {
  const t = useI18n("assistant");

  if (availability === "enabled") {
    return <AssistantLauncher>{children}</AssistantLauncher>;
  }

  return <DisabledAssistant description={t(unavailableMessageKeys[availability])}>{children}</DisabledAssistant>;
};
