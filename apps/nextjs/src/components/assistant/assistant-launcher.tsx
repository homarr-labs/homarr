"use client";

import type { PropsWithChildren, ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useHotkeys } from "@mantine/hooks";

import { hotkeys } from "@homarr/definitions";
import { useRegisterSpotlightContextResults } from "@homarr/spotlight";
import { closeSpotlight } from "@homarr/spotlight/store";
import { useI18n } from "@homarr/translation/client";
import type { WidgetComponentProps } from "@homarr/widgets";
import { AssistantWidgetRendererProvider } from "@homarr/widgets/assistant/context";

import { AssistantContext } from "./assistant-context";
import type { AssistantContextValue } from "./assistant-context";
import { createAssistantPromptInteraction } from "./assistant-spotlight";

const EnabledAssistantRoot = dynamic(
  () => import("./assistant-provider").then((module) => ({ default: module.EnabledAssistantRoot })),
  { ssr: false },
);

export type AssistantWidgetRender = (props: WidgetComponentProps<"assistant">) => ReactNode;

const AssistantWidgetMountContext = createContext<{
  register: (id: string) => void;
  unregister: (id: string) => void;
  render: AssistantWidgetRender | null;
} | null>(null);

const DeferredAssistantWidget = (props: WidgetComponentProps<"assistant">) => {
  const mounts = useContext(AssistantWidgetMountContext);
  const generatedId = useId();
  const widgetId = props.itemId ?? generatedId;
  const register = mounts?.register;
  const unregister = mounts?.unregister;

  useEffect(() => {
    register?.(widgetId);
    return () => unregister?.(widgetId);
  }, [register, unregister, widgetId]);

  if (mounts?.render) return mounts.render(props);
  return <div style={{ width: "100%", height: "100%" }} />;
};

const DeferredAssistantSpotlight = ({ sendPrompt }: Pick<AssistantContextValue, "sendPrompt">) => {
  const t = useI18n("assistant");
  const item = useMemo(
    () => ({
      id: "homarr-assistant",
      name: t("spotlight"),
      icon: "/logo/logo.png",
      description: t("spotlightDescription"),
      alwaysVisible: true,
      placement: "fallback" as const,
      interaction: (prompt: string) =>
        createAssistantPromptInteraction({ sendPrompt, prompt, onPromptAccepted: closeSpotlight }),
    }),
    [sendPrompt, t],
  );
  useRegisterSpotlightContextResults("homarr-assistant", [item], [item]);
  return null;
};

export const AssistantLauncher = ({ children }: PropsWithChildren) => {
  const [activated, setActivated] = useState(false);
  const [opened, setOpened] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const pendingPromptRef = useRef<string | null>(null);
  const [runtimeValue, setRuntimeValue] = useState<AssistantContextValue | null>(null);
  const runtimeRef = useRef<AssistantContextValue | null>(null);
  const [widgets, setWidgets] = useState<Set<string>>(() => new Set());
  const [renderWidget, setRenderWidget] = useState<AssistantWidgetRender | null>(null);
  const onWidgetRender = useCallback((render: AssistantWidgetRender) => setRenderWidget(() => render), []);
  const onOpen = useCallback(() => setOpened(true), []);
  const close = useCallback(() => setOpened(false), []);
  const open = useCallback(() => {
    setActivated(true);
    if (runtimeRef.current) runtimeRef.current.open();
    else setOpened(true);
  }, []);
  const toggle = useCallback(() => {
    if (opened) close();
    else open();
  }, [close, open, opened]);
  const queuePrompt = useCallback((prompt: string) => {
    const text = prompt.trim();
    if (!text || pendingPromptRef.current !== null) return false;
    pendingPromptRef.current = text;
    setPendingPrompt(text);
    setActivated(true);
    return true;
  }, []);
  const sendPrompt = useCallback(
    (prompt: string) => {
      if (runtimeRef.current) return runtimeRef.current.sendPrompt(prompt);
      return queuePrompt(prompt);
    },
    [queuePrompt],
  );
  const onPromptHandled = useCallback(() => {
    pendingPromptRef.current = null;
    setPendingPrompt(null);
  }, []);
  const onStateChange = useCallback((value: AssistantContextValue) => {
    runtimeRef.current = value;
    setRuntimeValue(value);
  }, []);
  const register = useCallback((id: string) => {
    setActivated(true);
    setWidgets((current) => {
      if (current.has(id)) return current;
      return new Set([...current, id]);
    });
  }, []);
  const unregister = useCallback((id: string) => {
    setWidgets((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);
  const mounts = useMemo(() => ({ register, unregister, render: renderWidget }), [register, renderWidget, unregister]);
  useHotkeys([[hotkeys.openAssistant, open, { preventDefault: true }]]);

  const value = useMemo<AssistantContextValue>(
    () => ({
      enabled: true,
      unavailableDescription: null,
      isRefreshing: false,
      unreadCount: 0,
      hasVisibleWidget: false,
      activeWidgetId: null,
      refreshCurrentView: () => Promise.resolve(),
      setWidgetVisible: () => undefined,
      activateWidget: () => undefined,
      ...runtimeValue,
      opened,
      isRunning: pendingPrompt !== null || runtimeValue?.isRunning === true,
      open,
      close,
      toggle,
      sendPrompt,
    }),
    [close, open, opened, pendingPrompt, runtimeValue, sendPrompt, toggle],
  );
  const active = opened || widgets.size > 0 || pendingPrompt !== null || runtimeValue?.isRunning === true;

  return (
    <AssistantContext.Provider value={value}>
      <AssistantWidgetMountContext.Provider value={mounts}>
        <AssistantWidgetRendererProvider renderer={DeferredAssistantWidget}>{children}</AssistantWidgetRendererProvider>
        {!activated && <DeferredAssistantSpotlight sendPrompt={sendPrompt} />}
        {activated && (
          <EnabledAssistantRoot
            opened={opened}
            onOpen={onOpen}
            onClose={close}
            onStateChange={onStateChange}
            onWidgetRender={onWidgetRender}
            onRequestPrompt={queuePrompt}
            pendingPrompt={pendingPrompt}
            onPromptHandled={onPromptHandled}
            active={active}
          />
        )}
      </AssistantWidgetMountContext.Provider>
    </AssistantContext.Provider>
  );
};
