"use client";

import { useMemo } from "react";

import { useScopedI18n } from "@homarr/translation/client";
import { CustomJsxRenderer, parseRequestCapabilities } from "@homarr/custom-widgets/runtime";

import { createWhitelistedComponents, SAFE_BINDINGS } from "./jsx-whitelist";
import { WidgetDefinitionProvider } from "./widget-definition-context";

export { CUSTOM_JSX_METHOD_COLORS } from "@homarr/custom-widgets/runtime";

export default function CustomJsxDisplay({ data }: { data: Record<string, unknown> }) {
  const t = useScopedI18n("widget.customApi.customJsx");
  const capabilities = useMemo(() => parseRequestCapabilities(data.requestCapabilities), [data.requestCapabilities]);
  const components = useMemo(() => createWhitelistedComponents({ copy: t("copy"), copied: t("copied") }), [t]);
  const renderer = (
    <CustomJsxRenderer
      template={String(data.template ?? "")}
      data={data.data}
      requestCapabilities={capabilities}
      components={components}
      createBindings={SAFE_BINDINGS}
      messages={{
        noTemplate: t("noTemplate"),
        interactive: t("interactive"),
        networkCapabilities: t("networkCapabilities"),
        templateWarnings: (count) => t("templateWarnings", { count: String(count) }),
      }}
    />
  );
  const hasRuntime = typeof data.widgetItemId === "string" || typeof data.previewSessionId === "string";
  return hasRuntime ? (
    <WidgetDefinitionProvider
      definitionId={String(data.widgetDefinitionId ?? "")}
      itemId={typeof data.widgetItemId === "string" ? data.widgetItemId : undefined}
      previewSessionId={typeof data.previewSessionId === "string" ? data.previewSessionId : undefined}
      previewLiveActions={data.previewLiveActions === true}
      isEditMode={data.isEditMode === true}
      requestCapabilities={capabilities}
    >
      {renderer}
    </WidgetDefinitionProvider>
  ) : (
    renderer
  );
}
