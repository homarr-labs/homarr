"use client";

import type { ReactNode } from "react";

import { fetchApi, clientApi } from "@homarr/api/client";
import type {
  CustomJsxRequestCapability,
  CustomWidgetRuntimeMessages,
  CustomWidgetRuntimePort,
} from "@homarr/custom-widgets/runtime";
import { CustomWidgetRuntimeProvider } from "@homarr/custom-widgets/runtime";
import { useConfirmModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

interface WidgetDefinitionProviderProps {
  itemId?: string;
  definitionId?: string;
  previewSessionId?: string;
  previewLiveActions?: boolean;
  isEditMode?: boolean;
  requestCapabilities?: readonly CustomJsxRequestCapability[];
  children: ReactNode;
}

export function WidgetDefinitionProvider(props: WidgetDefinitionProviderProps) {
  const t = useScopedI18n("widget.customApi.customJsx");
  const utils = clientApi.useUtils();
  const { openConfirmModal } = useConfirmModal();
  const messages: CustomWidgetRuntimeMessages = {
    migrationRequired: t("migrationRequired"),
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
      if (previewSessionId) {
        await utils.customWidget.previewQuery.invalidate();
        return;
      }
      if (!itemId) return;
      const tasks: Promise<unknown>[] = [];
      if (targets.includes("parent")) tasks.push(utils.widget.customApi.getData.invalidate({ itemId }));
      if (targets.some((target) => target !== "parent")) tasks.push(utils.widget.customApi.queryRequest.invalidate());
      await Promise.all(tasks);
    },
    confirm: ({ title, message }) =>
      new Promise((resolve) => {
        openConfirmModal({ title, children: message, onConfirm: () => resolve(true), onCancel: () => resolve(false) });
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
      isEditMode={props.isEditMode ?? false}
      requestCapabilities={props.requestCapabilities ?? []}
      port={port}
      messages={messages}
    >
      {props.children}
    </CustomWidgetRuntimeProvider>
  );
}
