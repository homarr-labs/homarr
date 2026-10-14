"use client";

import { memo } from "react";
import { SegmentedControl, VisuallyHidden } from "@mantine/core";

import type { CustomWidgetPreviewSizeControlProps } from "./contracts";

const previewSizeShortLabels = { compact: "S", standard: "M", wide: "L" };

function CustomWidgetPreviewSizeControlContent({ value, onChange, copy }: CustomWidgetPreviewSizeControlProps) {
  return (
    <SegmentedControl
      size="xs"
      value={value}
      onChange={onChange}
      data={[
        {
          value: "compact",
          label: (
            <span title={copy.compact}>
              <span aria-hidden>{previewSizeShortLabels.compact}</span>
              <VisuallyHidden>{copy.compact}</VisuallyHidden>
            </span>
          ),
        },
        {
          value: "standard",
          label: (
            <span title={copy.standard}>
              <span aria-hidden>{previewSizeShortLabels.standard}</span>
              <VisuallyHidden>{copy.standard}</VisuallyHidden>
            </span>
          ),
        },
        {
          value: "wide",
          label: (
            <span title={copy.wide}>
              <span aria-hidden>{previewSizeShortLabels.wide}</span>
              <VisuallyHidden>{copy.wide}</VisuallyHidden>
            </span>
          ),
        },
      ]}
    />
  );
}

export const CustomWidgetPreviewSizeControl = memo(CustomWidgetPreviewSizeControlContent);
