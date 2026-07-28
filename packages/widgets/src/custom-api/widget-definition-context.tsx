"use client";

import type { ReactNode } from "react";

import { fetchApi, clientApi } from "@homarr/api/client";
import type {
  CustomWidgetPublishedQueryState,
  CustomJsxRequestCapability,
  CustomWidgetRuntimeMessages,
  CustomWidgetRuntimePort,
} from "@homarr/custom-widgets/runtime";
import { CustomWidgetRuntimeProvider } from "@homarr/custom-widgets/runtime";
import { useConfirmModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import { useQueryClient } from "@tanstack/react-query";

import { resolveCustomWidgetInvalidationTargets } from "./widget-invalidation";

interface WidgetDefinitionProviderProps {
  itemId?: string;
  definitionId?: string;
  previewSessionId?: string;
  previewLiveActions?: boolean;
  queriesDisabled?: boolean;
  canInvalidateQueries?: boolean;
  isEditMode?: boolean;
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
  const t = useScopedI18n("widget.customApi.customJsx");
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
    refresh: t("refresh"),
  };
};

export function InactiveWidgetDefinitionProvider({
  definitionId,
  isEditMode,
  children,
}: Pick<WidgetDefinitionProviderProps, "definitionId" | "isEditMode" | "children">) {
  const messages = useRuntimeMessages();
  return (
    <CustomWidgetRuntimeProvider
      definitionId={definitionId}
      canInvalidateQueries={false}
      isEditMode={isEditMode ?? false}
      requestCapabilities={[]}
      port={INACTIVE_PORT}
      messages={messages}
    >
      {children}
    </CustomWidgetRuntimeProvider>
  );
}

export function WidgetDefinitionProvider(props: WidgetDefinitionProviderProps) {
  const utils = clientApi.useUtils();
  const queryClient = useQueryClient();
  const { openConfirmModal } = useConfirmModal();
  const messages = useRuntimeMessages();
  const port: CustomWidgetRuntimePort = {
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
    invalidate: async ({ itemId, previewSessionId, targets, refresh }) => {
      const invalidation = resolveCustomWidgetInvalidationTargets(props.requestCapabilities ?? [], targets);
      if (previewSessionId) {
        if (refresh && invalidation.requestIds.length > 0) {
          await fetchApi.customWidget.previewRefresh.mutate({
            sessionId: previewSessionId,
            requestIds: invalidation.requestIds,
            all: invalidation.all,
          });
        }
        const tasks: Promise<unknown>[] = [];
        if (invalidation.requestIds.length > 0) {
          tasks.push(
            queryClient.invalidateQueries({
              predicate: (query) => {
                const key = query.queryKey;
                return (
                  key[0] === "custom-widget" &&
                  key[1] === previewSessionId &&
                  invalidation.requestIds.includes(String(key[2]))
                );
              },
            }),
          );
        }
        if (invalidation.refreshParent) {
          tasks.push(
            ...invalidation.loadRequestIds.map(async (requestId) => {
              try {
                const result = await fetchApi.customWidget.previewQuery.query({
                  sessionId: previewSessionId,
                  requestId,
                  params: {},
                });
                props.setQueryState?.(requestId, {
                  data: result.data,
                  status: {
                    loading: false,
                    ok: result.ok,
                    status: result.status,
                    statusText: result.statusText,
                    error: result.error,
                  },
                });
              } catch {
                props.setQueryState?.(requestId, {
                  data: null,
                  status: { loading: false, ok: false, status: 0, error: messages.requestFailed },
                });
              }
            }),
          );
        }
        await Promise.all(tasks);
        return;
      }
      if (!itemId) return;
      if (invalidation.requestIds.length === 0 && !invalidation.refreshParent) return;
      if (refresh && invalidation.requestIds.length > 0) {
        await fetchApi.widget.customApi.refreshQueries.mutate({
          itemId,
          requestIds: invalidation.requestIds,
          all: invalidation.all,
        });
      }
      const tasks: Promise<unknown>[] = [];
      if (invalidation.requestIds.length > 0) {
        tasks.push(
          queryClient.invalidateQueries({
            predicate: (query) => {
              const key = query.queryKey;
              return (
                key[0] === "custom-widget" && key[1] === itemId && invalidation.requestIds.includes(String(key[2]))
              );
            },
          }),
        );
      }
      if (invalidation.refreshParent) {
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
  };
  return (
    <CustomWidgetRuntimeProvider
      itemId={props.itemId}
      definitionId={props.definitionId}
      previewSessionId={props.previewSessionId}
      previewLiveActions={props.previewLiveActions}
      queriesDisabled={props.queriesDisabled}
      canInvalidateQueries={props.canInvalidateQueries ?? Boolean(props.previewSessionId)}
      isEditMode={props.isEditMode ?? false}
      requestCapabilities={props.requestCapabilities ?? []}
      port={port}
      messages={messages}
      setQueryState={props.setQueryState}
    >
      {props.children}
    </CustomWidgetRuntimeProvider>
  );
}
