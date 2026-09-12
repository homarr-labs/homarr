"use client";

import type { CustomWidgetNativeCapability } from "@homarr/custom-widgets/core";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { fetchApi, clientApi } from "@homarr/api/client";
import type {
  CustomWidgetPublishedQueryState,
  CustomJsxRequestCapability,
  CustomWidgetRuntimeMessages,
  CustomWidgetRuntimePort,
} from "@homarr/custom-widgets/runtime";
import {
  CustomWidgetRuntimeProvider,
  observeCustomWidgetQueries,
  useCustomWidgetQueryObserver,
} from "@homarr/custom-widgets/runtime";
import { useConfirmModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { useQueryClient } from "@tanstack/react-query";

interface WidgetDefinitionProviderProps {
  itemId?: string;
  definitionId?: string;
  queryCacheKey?: string;
  previewSessionId?: string;
  previewLiveActions?: boolean;
  queriesDisabled?: boolean;
  isEditMode?: boolean;
  nativeCapabilities?: Record<string, CustomWidgetNativeCapability>;
  queryFixtures?: Record<string, CustomWidgetPublishedQueryState>;
  requestCapabilities?: readonly CustomJsxRequestCapability[];
  setQueryState?(requestId: string, value: CustomWidgetPublishedQueryState | null): void;
  children: ReactNode;
}

const INACTIVE_PORT: CustomWidgetRuntimePort = {
  query: async () => ({ ok: false, status: 0, data: null, error: "Custom widget unavailable" }),
  executeAction: async () => ({ ok: false, status: 0, data: null, error: "Custom widget unavailable" }),
  invalidate: async () => undefined,
  confirm: async () => false,
  notify: () => undefined,
};

const useRuntimeMessages = (): CustomWidgetRuntimeMessages => {
  const t = useI18n("widget.customApi.customJsx");
  const actionT = useI18n("common.action");
  return {
    requestIdRequired: t("requestIdRequired"),
    unsavedPreview: t("unsavedPreview"),
    invalidParams: t("invalidParams"),
    loadRequest: t("loadRequest"),
    requestFailed: t("requestFailed"),
    loading: t("loading"),
    retry: t("retry"),
    widgetItemUnavailable: t("widgetItemUnavailable"),
    actionsDisabledEditMode: t("actionsDisabledEditMode"),
    actionSimulated: t("actionSimulated"),
    actionCompleted: t("actionCompleted"),
    confirmDelete: t("confirmDelete"),
    toggle: t("toggle"),
    refresh: actionT("refresh"),
  };
};

export function InactiveWidgetDefinitionProvider({
  definitionId,
  isEditMode,
  nativeCapabilities,
  queryFixtures,
  children,
}: Pick<
  WidgetDefinitionProviderProps,
  "definitionId" | "isEditMode" | "nativeCapabilities" | "queryFixtures" | "children"
>) {
  const messages = useRuntimeMessages();
  return (
    <CustomWidgetRuntimeProvider
      definitionId={definitionId}
      isEditMode={isEditMode ?? false}
      requestCapabilities={[]}
      nativeCapabilities={nativeCapabilities}
      queryFixtures={queryFixtures}
      queriesDisabled
      port={INACTIVE_PORT}
      messages={messages}
    >
      {children}
    </CustomWidgetRuntimeProvider>
  );
}

export function WidgetDefinitionProvider(props: WidgetDefinitionProviderProps) {
  const queryObserver = useCustomWidgetQueryObserver();
  const utils = clientApi.useUtils();
  const queryClient = useQueryClient();
  const { openConfirmModal } = useConfirmModal();
  const messages = useRuntimeMessages();
  const port = useMemo<CustomWidgetRuntimePort>(
    () => ({
      readContent: (input, signal) => fetchApi.customWidget.contentRead.query(input, { signal }),
      writeContent: (input) => fetchApi.customWidget.contentWrite.mutate(input),
      queryNative: (input, signal) => fetchApi.customWidget.nativeQuery.query(input, { signal }),
      executeNativeAction: (input) => fetchApi.customWidget.nativeAction.mutate(input),
      subscribeNative: (input, onData, onError) => {
        let active = true;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let subscription: { unsubscribe(): void } | undefined;
        const connect = () => {
          if (!active) return;
          subscription = utils.client.customWidget.nativeSubscribe.subscribe(input, {
            onData,
            onError,
            onComplete: () => {
              if (active) timer = setTimeout(connect, 1000);
            },
          });
        };
        connect();
        return () => {
          active = false;
          clearTimeout(timer);
          subscription?.unsubscribe();
        };
      },
      query: async (input, signal) => {
        if (input.itemId) {
          return fetchApi.widget.customApi.queryRequest.query(
            { itemId: input.itemId, requestId: input.requestId, params: input.params },
            { signal },
          );
        }
        return fetchApi.customWidget.previewQuery.query(
          { sessionId: input.previewSessionId ?? "", requestId: input.requestId, params: input.params },
          { signal },
        );
      },
      executeAction: (input) =>
        input.itemId
          ? fetchApi.widget.customApi.executeAction.mutate({
              itemId: input.itemId,
              requestId: input.requestId,
              params: input.params,
              confirmed: input.confirmed,
            })
          : fetchApi.customWidget.previewAction.mutate({
              sessionId: input.previewSessionId ?? "",
              requestId: input.requestId,
              params: input.params,
              confirmed: input.confirmed,
            }),
      invalidate: async ({ itemId, previewSessionId, targets }) => {
        const invalidateAll = targets.includes("*");
        if (previewSessionId) {
          if (invalidateAll) {
            await fetchApi.customWidget.previewRefresh.mutate({ sessionId: previewSessionId });
          }
          await queryClient.invalidateQueries({
            predicate: (query) => {
              const key = query.queryKey;
              return (
                key[0] === "custom-widget" &&
                key[1] === "preview" &&
                key[2] === previewSessionId &&
                (invalidateAll || targets.includes(String(key[3])))
              );
            },
          });
          return;
        }
        if (!itemId) return;
        if (targets.length === 0) return;
        if (invalidateAll) await fetchApi.widget.customApi.refresh.mutate({ itemId });
        const tasks: Promise<unknown>[] = [
          queryClient.invalidateQueries({
            predicate: (query) => {
              const key = query.queryKey;
              return (
                key[0] === "custom-widget" &&
                key[1] === "item" &&
                key[2] === itemId &&
                (invalidateAll || targets.includes(String(key[3])))
              );
            },
          }),
        ];
        if (
          invalidateAll ||
          (props.requestCapabilities ?? []).some(
            (request) => request.trigger === "load" && targets.includes(request.id),
          )
        ) {
          tasks.push(utils.widget.customApi.getData.invalidate({ itemId }));
        }
        await Promise.all(tasks);
      },
      confirm: ({ title, message, confirmLabel, destructive }) =>
        new Promise((resolve) => {
          openConfirmModal({
            title,
            children: message,
            labels: { confirm: confirmLabel },
            confirmProps: { color: destructive ? "red.9" : "blue" },
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false),
          });
        }),
      notify: ({ kind, ...notification }) =>
        kind === "success" ? showSuccessNotification(notification) : showErrorNotification(notification),
    }),
    [utils, queryClient, openConfirmModal, props.requestCapabilities],
  );
  const observedPort = useMemo(
    () => observeCustomWidgetQueries(port, queryObserver, messages.requestFailed),
    [port, queryObserver, messages.requestFailed],
  );
  return (
    <CustomWidgetRuntimeProvider
      itemId={props.itemId}
      definitionId={props.definitionId}
      queryCacheKey={props.queryCacheKey}
      previewSessionId={props.previewSessionId}
      previewLiveActions={props.previewLiveActions}
      queriesDisabled={props.queriesDisabled}
      isEditMode={props.isEditMode ?? false}
      requestCapabilities={props.requestCapabilities ?? []}
      nativeCapabilities={props.nativeCapabilities}
      queryFixtures={props.queryFixtures}
      port={observedPort}
      messages={messages}
      setQueryState={props.setQueryState}
    >
      {props.children}
    </CustomWidgetRuntimeProvider>
  );
}
