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
  children,
}: Pick<WidgetDefinitionProviderProps, "definitionId" | "isEditMode" | "children">) {
  const messages = useRuntimeMessages();
  return (
    <CustomWidgetRuntimeProvider
      definitionId={definitionId}
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
        (props.requestCapabilities ?? []).some((request) => request.trigger === "load" && targets.includes(request.id))
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
  };
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
      port={port}
      messages={messages}
      setQueryState={props.setQueryState}
    >
      {props.children}
    </CustomWidgetRuntimeProvider>
  );
}
