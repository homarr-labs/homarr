"use client";

import { memo } from "react";
import { SegmentedControl, VisuallyHidden } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

interface CustomWidgetPreviewSizeControlProps {
  value: string;
  onChange(value: string): void;
}

const previewSizeShortLabels = { compact: "S", standard: "M", wide: "L" } as const;

function CustomWidgetPreviewSizeControlContent({ value, onChange }: CustomWidgetPreviewSizeControlProps) {
  const t = useI18n("customWidget.workbench.preview");

  return (
    <SegmentedControl
      size="xs"
      value={value}
      onChange={onChange}
      data={[
        {
          value: "compact",
          label: (
            <span title={t("size.compact")}>
              <span aria-hidden>{previewSizeShortLabels.compact}</span>
              <VisuallyHidden>{t("size.compact")}</VisuallyHidden>
            </span>
          ),
        },
        {
          value: "standard",
          label: (
            <span title={t("size.standard")}>
              <span aria-hidden>{previewSizeShortLabels.standard}</span>
              <VisuallyHidden>{t("size.standard")}</VisuallyHidden>
            </span>
          ),
        },
        {
          value: "wide",
          label: (
            <span title={t("size.wide")}>
              <span aria-hidden>{previewSizeShortLabels.wide}</span>
              <VisuallyHidden>{t("size.wide")}</VisuallyHidden>
            </span>
          ),
        },
      ]}
    />
  );
}

export const CustomWidgetPreviewSizeControl = memo(CustomWidgetPreviewSizeControlContent);
