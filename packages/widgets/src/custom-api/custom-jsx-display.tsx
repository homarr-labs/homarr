"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useI18n } from "@homarr/translation/client";
import type { CustomWidgetPublishedQueryState } from "@homarr/custom-widgets/runtime";
import { CustomJsxRenderer, parseRequestCapabilities } from "@homarr/custom-widgets/runtime";

import { createCustomWidgetComponents, SAFE_BINDINGS } from "./jsx-components";
import { InactiveWidgetDefinitionProvider, WidgetDefinitionProvider } from "./widget-definition-context";

export { CUSTOM_JSX_METHOD_COLORS } from "@homarr/custom-widgets/runtime";

export default function CustomJsxDisplay({ data }: { data: Record<string, unknown> }) {
  const t = useI18n("widget.customApi.customJsx");
  const actionT = useI18n("common.action");
  const capabilities = useMemo(() => parseRequestCapabilities(data.requestCapabilities), [data.requestCapabilities]);
  const components = useMemo(
    () => createCustomWidgetComponents({ copy: actionT("copy"), copied: t("copied") }),
    [actionT, t],
  );
  const [queryState, setQueryState] = useState<Record<string, CustomWidgetPublishedQueryState>>({});
  useEffect(
    () => setQueryState({}),
    [data.widgetDefinitionId, data.widgetItemId, data.previewSessionId, data.template],
  );
  const publishQueryState = useCallback((requestId: string, value: CustomWidgetPublishedQueryState | null) => {
    setQueryState((current) => {
      if (!value) {
        if (!Object.hasOwn(current, requestId)) return current;
        const next = { ...current };
        delete next[requestId];
        return next;
      }
      const previous = current[requestId];
      if (previous && previous.data === value.data && sameStatus(previous.status, value.status)) return current;
      return { ...current, [requestId]: value };
    });
  }, []);
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
      }}
    />
  );
  const definitionId = typeof data.widgetDefinitionId === "string" ? data.widgetDefinitionId : undefined;
  const itemId = typeof data.widgetItemId === "string" ? data.widgetItemId : undefined;
  const previewSessionId = typeof data.previewSessionId === "string" ? data.previewSessionId : undefined;
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
