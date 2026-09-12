"use client";

import type { PropsWithChildren, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, useComputedColorScheme } from "@mantine/core";
import { useReducedMotion } from "@mantine/hooks";
import { IconCode } from "@tabler/icons-react";
import { hashKey, useQueryClient } from "@tanstack/react-query";

import { clientApi, fetchApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { getSafeAppHref } from "@homarr/common";
import { useConfirmModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification, showWarningNotification } from "@homarr/notifications";
import { useRegisterSpotlightContextActions } from "@homarr/spotlight";
import { useCurrentIntlLocale } from "@homarr/translation/client";
import { createWidgetStateStore, WidgetHostProvider } from "@homarr/widget-sdk";
import type { WidgetCommand, WidgetHostContext, WidgetHostServices, WidgetStateStore } from "@homarr/widget-sdk/shared";

import type { WidgetComponentProps } from "../definition";
import type { TrustedWidgetData } from "./trusted-widget-types";
import { useTrustedWidgetTransport } from "./trusted-widget-transport";

export function TrustedWidgetHost({
  data,
  widget,
  children,
  onOptionsChange,
  frozen = false,
  notice,
}: PropsWithChildren<{
  data: TrustedWidgetData;
  widget: WidgetComponentProps<"customApi">;
  onOptionsChange?: (options: Record<string, unknown>) => void;
  frozen?: boolean;
  notice?: ReactNode;
}>) {
  const { data: session } = useSession();
  const { boardId, itemId, isEditMode, setOptions, openAdvancedFocus, closeAdvancedFocus } = widget;
  const utils = clientApi.useUtils();
  const queryClient = useQueryClient();
  const locale = useCurrentIntlLocale();
  const colorScheme = useComputedColorScheme("dark");
  const reducedMotion = useReducedMotion();
  const { openConfirmModal } = useConfirmModal();
  const root = useRef<HTMLDivElement>(null);
  const frozenRef = useRef(frozen);
  frozenRef.current = frozen;
  const [visible, setVisible] = useState(true);
  const [commands, setCommands] = useState<readonly WidgetCommand[]>([]);
  const [detail, setDetail] = useState<{ title: string; content: ReactNode } | null>(null);
  const registrations = useRef(new Map<symbol, readonly WidgetCommand[]>());
  const stateRef = useRef<{ key: string; store: WidgetStateStore } | null>(null);
  const stateKey = `${data.installationId}:${data.manifest.sdkVersion}:${data.manifest.configurationVersion}:${session?.user.id ?? "guest"}`;
  if (stateRef.current?.key !== stateKey) {
    const saved = widget.widgetStateRef;
    if (saved && !saved.current) saved.current = {};
    const backing = saved?.current ?? {};
    const key = `custom-widget:${stateKey}`;
    if (!backing[key] || typeof backing[key] !== "object") backing[key] = {};
    stateRef.current = { key: stateKey, store: createWidgetStateStore(backing[key] as Record<string, unknown>) };
  }
  const state = stateRef.current.store;

  useEffect(() => {
    let intersects = true;
    const update = () => setVisible(intersects && document.visibilityState === "visible");
    const observer = new IntersectionObserver(([entry]) => {
      intersects = entry?.isIntersecting ?? true;
      update();
    });
    if (root.current) observer.observe(root.current);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  const subscriptionScope = hashKey([session?.user.id, itemId, data.previewId, data.artifactDigest, data.options]);
  const transport = useTrustedWidgetTransport(data.previewId, subscriptionScope, frozen);
  useEffect(() => {
    if (!frozen) return;
    const identity = widget.itemId ?? data.previewId;
    void queryClient.cancelQueries({
      predicate: ({ queryKey: key }) =>
        (key[0] === "custom-widget-sdk" || key[0] === "custom-widget") && key[2] === identity,
    });
  }, [data.previewId, frozen, queryClient, widget.itemId]);

  const registerCommands = useCallback((next: readonly WidgetCommand[]) => {
    const token = Symbol();
    registrations.current.set(token, next);
    setCommands([...registrations.current.values()].flat());
    return () => {
      registrations.current.delete(token);
      setCommands([...registrations.current.values()].flat());
    };
  }, []);

  const services = useMemo<WidgetHostServices>(
    () => ({
      transport,
      state,
      registerCommands,
      notify: ({ title, message, color }) => {
        const notification = { title, message: message ?? "" };
        if (color === "red") showErrorNotification(notification);
        else if (color === "yellow" || color === "orange") showWarningNotification(notification);
        else showSuccessNotification(notification);
      },
      navigate(href) {
        if (frozenRef.current) return;
        const target = getSafeAppHref(href);
        if (target) window.location.assign(target);
      },
      openDetail: (next) => {
        if (!frozenRef.current) setDetail(next);
      },
      closeDetail: () => setDetail(null),
      openAdvanced: () => {
        if (!frozenRef.current) openAdvancedFocus?.();
      },
      closeAdvanced: () => closeAdvancedFocus?.(),
      async updateOptions(options) {
        if (frozenRef.current) throw new Error("Preview the current draft before changing its configuration");
        if (onOptionsChange) {
          onOptionsChange(options);
          return;
        }
        if (!boardId || !itemId) throw new Error("This preview cannot save widget options");
        const newOptions = { configuration: options };
        if (!isEditMode) {
          await fetchApi.widget.options.saveItemOptions.mutate({
            boardId,
            itemId,
            newOptions,
          });
        }
        setOptions({ newOptions });
        await utils.widget.customApi.getData.invalidate({ itemId });
      },
      confirm: ({ title, message, destructive }) =>
        new Promise((resolve) => {
          if (frozenRef.current) {
            resolve(false);
            return;
          }
          openConfirmModal(
            {
              title,
              children: message,
              confirmProps: { color: destructive ? "red" : undefined },
              onConfirm: () => resolve(true),
              onCancel: () => resolve(false),
            },
            { onClose: () => resolve(false) },
          );
        }),
    }),
    [
      onOptionsChange,
      openConfirmModal,
      registerCommands,
      state,
      transport,
      utils.widget.customApi.getData,
      boardId,
      isEditMode,
      itemId,
      setOptions,
      openAdvancedFocus,
      closeAdvancedFocus,
    ],
  );

  const availableCommands = useMemo(
    () =>
      commands
        .filter((command) => !command.hidden)
        .map((command) => ({
          ...command,
          disabled: command.disabled || isEditMode || frozen,
          async run() {
            if (command.disabled || isEditMode || frozenRef.current) return;
            try {
              await command.run();
            } catch (error) {
              showErrorNotification({
                title: command.label,
                message: error instanceof Error ? error.message : String(error),
              });
            }
          },
        })),
    [commands, isEditMode, frozen],
  );

  useEffect(() => {
    const runtime = widget.widgetRuntimeRef?.current;
    if (!runtime) return;
    runtime.commands = availableCommands;
    return () => {
      if (runtime.commands === availableCommands) runtime.commands = [];
    };
  }, [availableCommands, widget.widgetRuntimeRef]);

  useEffect(() => {
    const runtime = widget.widgetRuntimeRef?.current;
    if (!runtime) return;
    const refresh = () => {
      if (frozen) return Promise.resolve();
      return queryClient.refetchQueries({
        queryKey: ["custom-widget-sdk", data.artifactDigest, widget.itemId ?? data.previewId, session?.user.id],
        type: "active",
      });
    };
    runtime.refresh = refresh;
    return () => {
      if (runtime.refresh === refresh) runtime.refresh = undefined;
    };
  }, [
    data.artifactDigest,
    data.previewId,
    frozen,
    queryClient,
    session?.user.id,
    widget.itemId,
    widget.widgetRuntimeRef,
  ]);

  useRegisterSpotlightContextActions(
    `custom-widget:${widget.itemId ?? data.installationId}`,
    availableCommands.map((command) => ({
      id: `${widget.itemId}:${command.id}`,
      name: command.label,
      description: command.description,
      icon: IconCode,
      disabled: command.disabled,
      interaction: () => ({ type: "javaScript" as const, onSelect: () => void command.run() }),
    })),
    [availableCommands, widget.itemId],
  );

  const displayScale = widget.displayScale ?? 1;
  const context: WidgetHostContext = {
    sdkVersion: "1",
    itemId: widget.itemId,
    previewId: data.previewId,
    boardId: widget.boardId,
    installationId: data.installationId,
    revisionId: data.artifactDigest,
    displayMode: widget.displayMode ?? "compact",
    width: widget.width,
    height: widget.height,
    displayScale,
    visibleWidth: widget.width * displayScale,
    visibleHeight: widget.height * displayScale,
    isEditMode: widget.isEditMode,
    isPreview: !widget.itemId,
    visible: visible && !frozen,
    executionEnabled: !frozen,
    refreshIntervalSeconds: widget.options.refreshInterval,
    locale,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    colorScheme,
    reducedMotion: reducedMotion ?? false,
    userId: session?.user.id,
  };

  return (
    <WidgetHostProvider context={context} services={services} options={data.options}>
      <div
        ref={root}
        data-custom-widget={data.installationId}
        data-custom-widget-artifact={data.artifactDigest}
        data-mantine-color-scheme={colorScheme}
        style={{ width: "100%", height: "100%", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}
      >
        {notice}
        <div inert={frozen} style={{ width: "100%", height: "100%", minWidth: 0, minHeight: 0, flex: 1 }}>
          {children}
        </div>
      </div>
      <Modal opened={detail !== null} onClose={() => setDetail(null)} title={detail?.title} size="xl">
        <div inert={frozen} data-custom-widget-artifact={data.artifactDigest} data-mantine-color-scheme={colorScheme}>
          {detail?.content}
        </div>
      </Modal>
    </WidgetHostProvider>
  );
}
