"use client";

import type { PropsWithChildren } from "react";
import { useMemo } from "react";
import dynamic from "next/dynamic";

import { useSession } from "@homarr/auth/client";
import { useScopedI18n } from "@homarr/translation/client";
import { AssistantWidgetRendererProvider } from "@homarr/widgets";

import { AssistantContext } from "./assistant-context";
import { AssistantBoardWidgetLazy } from "./assistant-widget-lazy";
import { useRegisterAssistantSpotlightPlaceholder } from "./assistant-spotlight-placeholder";

/**
 * The enabled runtime is the expensive half of the assistant (assistant-ui, Lexical, Markdown,
 * Mermaid). Loading it through `next/dynamic` puts it in its own chunk that is only requested when
 * this component actually renders. Because `enabled` is resolved on the server and handed down as a
 * prop, an instance with the assistant switched off never renders it, so the chunk is never part of
 * the page payload. SSR stays on so enabled instances render children in the initial HTML without a
 * loading flash or a remount once the chunk arrives.
 */
const EnabledAssistantRoot = dynamic(() =>
  import("./assistant-provider").then((module) => ({ default: module.EnabledAssistantRoot })),
);

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
      open: () => undefined,
      close: () => undefined,
      toggle: () => undefined,
      sendPrompt: () => false,
      refreshCurrentView: () => Promise.resolve(),
    }),
    [description],
  );

  return (
    <AssistantContext.Provider value={value}>
      <AssistantWidgetRendererProvider renderer={AssistantBoardWidgetLazy}>{children}</AssistantWidgetRendererProvider>
    </AssistantContext.Provider>
  );
};

interface AssistantGateProps extends PropsWithChildren {
  /** Resolved on the server from the instance configuration, not per user. */
  enabled: boolean;
}

export const AssistantGate = ({ enabled, children }: AssistantGateProps) => {
  const t = useScopedI18n("common.assistant");
  const session = useSession();

  if (!enabled) {
    return <DisabledAssistant description={t("unavailable.notConfigured")}>{children}</DisabledAssistant>;
  }

  // The instance has the assistant on, but it is still per-user gated behind a session.
  if (session.status !== "authenticated") {
    return <DisabledAssistant description={t("unavailable.signIn")}>{children}</DisabledAssistant>;
  }

  return <EnabledAssistantRoot>{children}</EnabledAssistantRoot>;
};
