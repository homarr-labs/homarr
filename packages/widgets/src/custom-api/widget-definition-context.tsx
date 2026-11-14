"use client";

import type { ReactNode } from "react";
import { useLayoutEffect, useMemo, useRef } from "react";

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
const EMPTY_REQUEST_CAPABILITIES: readonly CustomJsxRequestCapability[] = [];

const useRuntimeMessages = (): CustomWidgetRuntimeMessages => {
  const t = useI18n("widget.customApi.customJsx");
  const actionT = useI18n("common.action");
  return useMemo(
    () => ({
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
    }),
    [t, actionT],
  );
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
      requestCapabilities={EMPTY_REQUEST_CAPABILITIES}
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
  const confirmModal = useRef(openConfirmModal);
  useLayoutEffect(() => {
    confirmModal.current = openConfirmModal;
  }, [openConfirmModal]);
  const messages = useRuntimeMessages();
  const { queriesDisabled, requestCapabilities = EMPTY_REQUEST_CAPABILITIES, setQueryState } = props;
  const requestFailed = messages.requestFailed;
  const port = useMemo<CustomWidgetRuntimePort>(
    () => ({
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
        if (targets.length === 0) return;
        const invalidateAll = targets.includes("*");
        if (previewSessionId) {
          if (queriesDisabled) return;
          const requests = requestCapabilities.filter(
            (request) => request.kind === "query" && (invalidateAll || targets.includes(request.id)),
          );
          await fetchApi.customWidget.previewRefresh.mutate({
            sessionId: previewSessionId,
            requestIds: requests.map((request) => request.id),
          });
          // Preview load data starts as a snapshot, not an active React Query subscription.
          // Publish refreshed load results so both editor and standalone previews update.
          await Promise.all(
            requests
              .filter((request) => request.trigger === "load")
              .map(async (request) => {
                setQueryState?.(request.id, { data: null, status: { loading: true } });
                try {
                  const result = await port.query({ previewSessionId, requestId: request.id, params: {} });
                  setQueryState?.(request.id, {
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
                  setQueryState?.(request.id, {
                    data: null,
                    status: { loading: false, ok: false, error: requestFailed },
                  });
                }
              }),
          );
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
          requestCapabilities.some((request) => request.trigger === "load" && targets.includes(request.id))
        ) {
          tasks.push(utils.widget.customApi.getData.invalidate({ itemId }));
        }
        await Promise.all(tasks);
      },
      confirm: ({ title, message, confirmLabel, destructive }) =>
        new Promise((resolve) => {
          confirmModal.current({
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
    [queriesDisabled, queryClient, requestCapabilities, requestFailed, setQueryState, utils],
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
      requestCapabilities={requestCapabilities}
      port={port}
      messages={messages}
      setQueryState={props.setQueryState}
    >
      {props.children}
    </CustomWidgetRuntimeProvider>
  );
}
