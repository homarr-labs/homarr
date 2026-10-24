"use client";

import { useCallback, useMemo, useState } from "react";

import { isRecord } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";
import type { CustomJsxRendererMessages, CustomWidgetPublishedQueryState } from "@homarr/custom-widgets/runtime";
import { CustomJsxRenderer, parseRequestCapabilities } from "@homarr/custom-widgets/runtime";

import { createCustomWidgetComponents, SAFE_BINDINGS } from "./jsx-components";
import { InactiveWidgetDefinitionProvider, WidgetDefinitionProvider } from "./widget-definition-context";

export { CUSTOM_JSX_METHOD_COLORS } from "@homarr/custom-widgets/runtime";

const EMPTY_QUERY_STATUS: Record<string, CustomWidgetPublishedQueryState["status"]> = {};
const EMPTY_RECORD: Record<string, never> = {};

interface ScopedQueryState {
  key: string;
  data: Record<string, unknown>;
  status: Record<string, CustomWidgetPublishedQueryState["status"]>;
}

export default function CustomJsxDisplay({ data }: { data: Record<string, unknown> }) {
  const t = useI18n("widget.customApi.customJsx");
  const actionT = useI18n("common.action");
  const diagnosticsT = useI18n("customWidget.editor.diagnostics");
  const capabilities = useMemo(() => parseRequestCapabilities(data.requestCapabilities), [data.requestCapabilities]);
  const copyLabel = actionT("copy");
  const copiedLabel = t("copied");
  const components = useMemo(
    () => createCustomWidgetComponents({ copy: copyLabel, copied: copiedLabel }),
    [copiedLabel, copyLabel],
  );
  const bindingTypeConflict = useCallback<CustomJsxRendererMessages["bindingTypeConflict"]>(
    (name, firstType, secondType) => diagnosticsT("runtimeBindingTypeConflict", { value: name, firstType, secondType }),
    [diagnosticsT],
  );
  const messages = useMemo<CustomJsxRendererMessages>(
    () => ({
      noTemplate: t("noTemplate"),
      templateWarnings: (count) => t("templateWarnings", { count: String(count) }),
      bindingTypeConflict,
    }),
    [bindingTypeConflict, t],
  );
  const definitionId = typeof data.widgetDefinitionId === "string" ? data.widgetDefinitionId : undefined;
  const itemId = typeof data.widgetItemId === "string" ? data.widgetItemId : undefined;
  const previewSessionId = typeof data.previewSessionId === "string" ? data.previewSessionId : undefined;
  const queryCacheKey = typeof data.queryCacheKey === "string" ? data.queryCacheKey : undefined;
  const queryScopeKey = [definitionId, itemId, previewSessionId, queryCacheKey].join("\u001f");
  const [publishedQueryState, setPublishedQueryState] = useState<ScopedQueryState>(() => ({
    key: queryScopeKey,
    data: {},
    status: {},
  }));
  const queryData = publishedQueryState.key === queryScopeKey ? publishedQueryState.data : EMPTY_RECORD;
  const queryStatus = publishedQueryState.key === queryScopeKey ? publishedQueryState.status : EMPTY_QUERY_STATUS;
  const publishQueryState = useCallback(
    (requestId: string, value: CustomWidgetPublishedQueryState | null) => {
      setPublishedQueryState((current) => {
        const currentData = current.key === queryScopeKey ? current.data : EMPTY_RECORD;
        const currentStatus = current.key === queryScopeKey ? current.status : EMPTY_QUERY_STATUS;
        if (!value) {
          if (!Object.hasOwn(currentStatus, requestId)) {
            if (current.key === queryScopeKey) return current;
            return { key: queryScopeKey, data: currentData, status: currentStatus };
          }
          const nextData = { ...currentData };
          const nextStatus = { ...currentStatus };
          delete nextData[requestId];
          delete nextStatus[requestId];
          return { key: queryScopeKey, data: nextData, status: nextStatus };
        }
        const previousStatus = currentStatus[requestId];
        const sameData = Boolean(previousStatus) && currentData[requestId] === value.data;
        const unchangedStatus = previousStatus && sameStatus(previousStatus, value.status);
        if (sameData && unchangedStatus) {
          if (current.key === queryScopeKey) return current;
          return { key: queryScopeKey, data: currentData, status: currentStatus };
        }
        return {
          key: queryScopeKey,
          data: sameData ? currentData : { ...currentData, [requestId]: value.data },
          status: unchangedStatus ? currentStatus : { ...currentStatus, [requestId]: value.status },
        };
      });
    },
    [queryScopeKey],
  );
  const baseData = isRecord(data.data) ? data.data : EMPTY_RECORD;
  const baseStatus = isRecord(data.status) ? data.status : EMPTY_RECORD;
  const rendererData = useMemo(() => {
    const entries = Object.entries(queryData);
    if (entries.length === 0) return baseData;
    return { ...baseData, ...queryData };
  }, [baseData, queryData]);
  const rendererStatus = useMemo(() => {
    const entries = Object.entries(queryStatus);
    if (entries.length === 0) return baseStatus;
    return { ...baseStatus, ...queryStatus };
  }, [baseStatus, queryStatus]);
  const renderer = (
    <CustomJsxRenderer
      template={String(data.template ?? "")}
      data={rendererData}
      status={rendererStatus}
      options={isRecord(data.options) ? data.options : EMPTY_RECORD}
      components={components}
      createBindings={SAFE_BINDINGS}
      messages={messages}
    />
  );
  if (!itemId && !previewSessionId) {
    return (
      <InactiveWidgetDefinitionProvider definitionId={definitionId} isEditMode={data.isEditMode === true}>
        {renderer}
      </InactiveWidgetDefinitionProvider>
    );
  }
  return (
    <WidgetDefinitionProvider
      definitionId={definitionId}
      itemId={itemId}
      queryCacheKey={queryCacheKey}
      previewSessionId={previewSessionId}
      previewLiveActions={data.previewLiveActions === true}
      queriesDisabled={data.queriesDisabled === true}
      isEditMode={data.isEditMode === true}
      requestCapabilities={capabilities}
      setQueryState={publishQueryState}
    >
      {renderer}
    </WidgetDefinitionProvider>
  );
}
function sameStatus(left: CustomWidgetPublishedQueryState["status"], right: CustomWidgetPublishedQueryState["status"]) {
  return (
    left.loading === right.loading &&
    left.ok === right.ok &&
    left.status === right.status &&
    left.statusText === right.statusText &&
    left.error === right.error
  );
}
