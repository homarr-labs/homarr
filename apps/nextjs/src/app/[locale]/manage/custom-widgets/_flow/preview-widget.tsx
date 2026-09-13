"use client";

import { Alert, Paper } from "@mantine/core";
import { PreviewErrorBoundary } from "@homarr/custom-widgets/workbench";
import { useI18n } from "@homarr/translation/client";
import CustomJsxDisplay from "@homarr/widgets/custom-api/custom-jsx-display";
import { WorkbenchPreviewSurface } from "./preview-theme";

const widths: Record<string, number> = { compact: 320, standard: 480, wide: 720 };
export const workbenchPreviewWidth = (size: string) => widths[size] ?? 480;
export function WorkbenchPreviewWidget({
  data,
  size,
  inspect,
  resetKey,
}: {
  data: Record<string, unknown> | null;
  size: string;
  inspect: boolean;
  resetKey: string;
}) {
  const t = useI18n("customWidget.workbench.preview");
  const errors = useI18n("customWidget.editor.errorBoundary");
  const actions = useI18n("common.action");
  return (
    <WorkbenchPreviewSurface>
      <Paper withBorder p="sm" h={360} w={workbenchPreviewWidth(size)} maw="100%" style={{ overflow: "auto" }}>
        {data ? (
          <PreviewErrorBoundary
            title={errors("title")}
            description={t("containedFailures")}
            retryLabel={actions("tryAgain")}
            resetKeys={[resetKey]}
          >
            <CustomJsxDisplay
              data={data}
              inspect={inspect}
              onInspect={(location) => {
                window.dispatchEvent(new CustomEvent("homarr:widget-inspect", { detail: location }));
                requestAnimationFrame(() =>
                  window.dispatchEvent(
                    new CustomEvent("homarr:widget-code-reveal", {
                      detail: {
                        editorId: location.fragment ? `fragment-${location.fragment}` : "jsx-editor",
                        index: location.index,
                      },
                    }),
                  ),
                );
              }}
            />
          </PreviewErrorBoundary>
        ) : (
          <Alert color="yellow">{t("invalid")}</Alert>
        )}
      </Paper>
    </WorkbenchPreviewSurface>
  );
}
