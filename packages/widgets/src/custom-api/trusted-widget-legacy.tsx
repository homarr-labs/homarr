"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";

import {
  CustomJsxRenderer,
  CustomWidgetRuntimeProvider,
  parseRequestCapabilities,
} from "@homarr/custom-widgets/runtime";
import type {
  CustomJsxInputState,
  CustomWidgetPublishedQueryState,
  CustomWidgetRequestResult,
  CustomWidgetRuntimePort,
} from "@homarr/custom-widgets/runtime";
import { useConfirmModal } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { useWidgetHost, useWidgetOptions, useWidgetServices, useWidgetState } from "@homarr/widget-sdk";

import { createCustomWidgetComponents, SAFE_BINDINGS } from "./jsx-components";
import { useRuntimeMessages } from "./widget-definition-context";

export { LegacyConfiguration } from "./trusted-widget-legacy-configuration";

export function LegacyWidget({ template, requestCapabilities }: { template: string; requestCapabilities?: unknown }) {
  const host = useWidgetHost();
  const services = useWidgetServices();
  const options = useWidgetOptions();
  const inputState = useWidgetState<CustomJsxInputState>("legacy-inputs", { values: {}, types: {} });
  const messages = useRuntimeMessages();
  const t = useI18n("widget.customApi.customJsx");
  const actionT = useI18n("common.action");
  const diagnosticsT = useI18n("customWidget.editor.diagnostics");
  const capabilities = useMemo(() => parseRequestCapabilities(requestCapabilities), [requestCapabilities]);
  const load = capabilities.filter((request) => request.kind === "query" && request.trigger === "load");
  const itemId = host.itemId ?? host.previewId ?? "";
  const queryCacheKey = `${host.revisionId}:${host.userId ?? "guest"}:${host.scope ?? ""}`;
  const [accessFailure, setAccessFailure] = useState<{ scope: string; error: unknown }>();
  const queryClient = useQueryClient();
  const { openConfirmModal } = useConfirmModal();
  const [published, setPublished] = useState<Record<string, CustomWidgetPublishedQueryState>>({});
  const publish = useCallback((name: string, state: CustomWidgetPublishedQueryState | null) => {
    setPublished((current) => {
      if (!state) {
        if (!Object.hasOwn(current, name)) return current;
        const next = { ...current };
        delete next[name];
        return next;
      }
      const previous = current[name];
      if (previous && previous.data === state.data && JSON.stringify(previous.status) === JSON.stringify(state.status))
        return current;
      return { ...current, [name]: state };
    });
  }, []);
  const queries = useQueries({
    queries: load.map((request) => ({
      queryKey: ["custom-widget-sdk", host.revisionId, itemId, host.userId, "query", host.scope, request.id, {}],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        services.transport.query(
          { itemId, name: request.id, input: { params: {} } },
          signal,
        ) as Promise<CustomWidgetRequestResult>,
      enabled: Boolean(itemId) && host.visible,
      refetchInterval: Math.max(1, host.refreshIntervalSeconds ?? 30) * 1000,
      retry: false,
    })),
  });
  const port: CustomWidgetRuntimePort = {
    query: async (input, signal) => {
      try {
        return (await services.transport.query(
          { itemId, name: input.requestId, input: { params: input.params } },
          signal ?? new AbortController().signal,
        )) as CustomWidgetRequestResult;
      } catch (error) {
        if (isAccessError(error)) {
          setAccessFailure({ scope: queryCacheKey, error });
          queryClient.removeQueries({
            predicate: ({ queryKey: key }) => key[0] === "custom-widget" && key[2] === itemId,
          });
        }
        throw error;
      }
    },
    executeAction: async (input) => {
      const result = await services.transport.action({
        itemId,
        name: input.requestId,
        input: { params: input.params, confirmed: input.confirmed },
      });
      if (result && typeof result === "object" && "simulated" in result && result.simulated)
        return { ok: true, status: 200, data: null, simulated: true };
      return result as CustomWidgetRequestResult;
    },
    invalidate: async ({ targets }) => {
      await queryClient.invalidateQueries({
        predicate: ({ queryKey: key }) => {
          if (key[0] === "custom-widget-sdk" && key[2] === itemId && key[4] === "query")
            return targets.includes("*") || targets.includes(String(key[6]));
          return (
            key[0] === "custom-widget" &&
            key[2] === itemId &&
            (targets.includes("*") || targets.includes(String(key[3])))
          );
        },
      });
    },
    confirm: ({ title, message, confirmLabel, destructive }) =>
      new Promise((resolve) =>
        openConfirmModal({
          title,
          children: message,
          labels: { confirm: confirmLabel },
          confirmProps: { color: destructive ? "red" : undefined },
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
        }),
      ),
    notify: ({ kind, title, message }) =>
      services.notify({ title, message, color: kind === "error" ? "red" : undefined }),
  };
  const copy = actionT("copy");
  const copied = t("copied");
  const components = useMemo(() => createCustomWidgetComponents({ copy, copied }), [copy, copied]);
  const data: Record<string, unknown> = {};
  const status: Record<string, unknown> = {};
  for (const [index, request] of load.entries()) {
    const query = queries[index];
    const response = query?.data;
    data[request.id] = response?.data ?? null;
    status[request.id] = {
      loading: query?.isFetching && !response,
      ok: response?.ok,
      status: response?.status,
      statusText: response?.statusText,
      error: response?.error ?? query?.error?.message,
    };
  }
  for (const [id, state] of Object.entries(published)) {
    data[id] = state.data;
    status[id] = state.status;
  }
  // Access failures invalidate any previously published SubFetch data before another render can reveal it.
  if (queries.some((query) => isAccessError(query.error)))
    throw queries.find((query) => isAccessError(query.error))?.error;
  if (accessFailure?.scope === queryCacheKey) throw accessFailure.error;
  return (
    <CustomWidgetRuntimeProvider
      itemId={host.itemId}
      previewSessionId={host.previewId}
      definitionId={host.installationId}
      queryCacheKey={queryCacheKey}
      isEditMode={host.isEditMode}
      queriesDisabled={!host.visible}
      requestCapabilities={capabilities}
      port={port}
      messages={messages}
      setQueryState={publish}
    >
      <CustomJsxRenderer
        inputState={inputState}
        template={template}
        data={data}
        status={status}
        options={options}
        host={{ ...host }}
        components={components}
        createBindings={SAFE_BINDINGS}
        messages={{
          noTemplate: t("noTemplate"),
          templateWarnings: (count) => t("templateWarnings", { count: String(count) }),
          bindingTypeConflict: (name, firstType, secondType) =>
            diagnosticsT("runtimeBindingTypeConflict", { value: name, firstType, secondType }),
        }}
      />
    </CustomWidgetRuntimeProvider>
  );
}

function isAccessError(error: unknown) {
  if (!error || typeof error !== "object" || !("data" in error)) return false;
  const data = error.data;
  return Boolean(
    data &&
    typeof data === "object" &&
    "code" in data &&
    ["FORBIDDEN", "UNAUTHORIZED", "NOT_FOUND"].includes(String(data.code)),
  );
}
