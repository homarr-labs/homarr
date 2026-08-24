"use client";

import { useCallback, useMemo, useState } from "react";

import { useI18n } from "@homarr/translation/client";
import type { CustomJsxRendererMessages, CustomWidgetPublishedQueryState } from "@homarr/custom-widgets/runtime";
import { CustomJsxRenderer, parseRequestCapabilities } from "@homarr/custom-widgets/runtime";

import { createCustomWidgetComponents, SAFE_BINDINGS } from "./jsx-components";
import { InactiveWidgetDefinitionProvider, WidgetDefinitionProvider } from "./widget-definition-context";

export { CUSTOM_JSX_METHOD_COLORS } from "@homarr/custom-widgets/runtime";

const EMPTY_QUERY_STATE: Record<string, CustomWidgetPublishedQueryState> = {};

interface ScopedQueryState {
  key: string;
  values: Record<string, CustomWidgetPublishedQueryState>;
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
  const definitionId = typeof data.widgetDefinitionId === "string" ? data.widgetDefinitionId : undefined;
  const itemId = typeof data.widgetItemId === "string" ? data.widgetItemId : undefined;
  const previewSessionId = typeof data.previewSessionId === "string" ? data.previewSessionId : undefined;
  const queryCacheKey = typeof data.queryCacheKey === "string" ? data.queryCacheKey : undefined;
  const queryScopeKey = [definitionId, itemId, previewSessionId, queryCacheKey].join("\u001f");
  const [publishedQueryState, setPublishedQueryState] = useState<ScopedQueryState>(() => ({
    key: queryScopeKey,
    values: {},
  }));
  const queryState = publishedQueryState.key === queryScopeKey ? publishedQueryState.values : EMPTY_QUERY_STATE;
  const publishQueryState = useCallback(
    (requestId: string, value: CustomWidgetPublishedQueryState | null) => {
      setPublishedQueryState((current) => {
        const currentValues = current.key === queryScopeKey ? current.values : EMPTY_QUERY_STATE;
        if (!value) {
          if (!Object.hasOwn(currentValues, requestId)) {
            if (current.key === queryScopeKey) return current;
            return { key: queryScopeKey, values: currentValues };
          }
          const next = { ...currentValues };
          delete next[requestId];
          return { key: queryScopeKey, values: next };
        }
        const previous = currentValues[requestId];
        if (previous && previous.data === value.data && sameStatus(previous.status, value.status)) {
          if (current.key === queryScopeKey) return current;
          return { key: queryScopeKey, values: currentValues };
        }
        return { key: queryScopeKey, values: { ...currentValues, [requestId]: value } };
      });
    },
    [queryScopeKey],
  );
  const baseData = isRecord(data.data) ? data.data : {};
  const baseStatus = isRecord(data.status) ? data.status : {};
  const renderer = (
    <CustomJsxRenderer
      template={String(data.template ?? "")}
      data={{ ...baseData, ...Object.fromEntries(Object.entries(queryState).map(([id, value]) => [id, value.data])) }}
      status={{
        ...baseStatus,
        ...Object.fromEntries(Object.entries(queryState).map(([id, value]) => [id, value.status])),
      }}
      options={isRecord(data.options) ? data.options : {}}
      components={components}
      createBindings={SAFE_BINDINGS}
      messages={{
        noTemplate: t("noTemplate"),
        templateWarnings: (count) => t("templateWarnings", { count: String(count) }),
        bindingTypeConflict,
      }}
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
