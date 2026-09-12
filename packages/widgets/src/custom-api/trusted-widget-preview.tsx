"use client";

import { useRef } from "react";

import { createWidgetRuntimeState } from "../definition";
import TrustedWidgetDisplay from "./trusted-widget-display";
import type { TrustedWidgetData } from "./trusted-widget-types";

export type { TrustedWidgetData } from "./trusted-widget-types";

export default function TrustedWidgetPreview({
  data,
  width,
  height,
  displayScale = 1,
  surface = "tile",
  onOptionsChange,
  onSurfaceChange,
  frozen = false,
  onReady,
  onLoadError,
}: {
  data: TrustedWidgetData;
  width: number;
  height: number;
  displayScale?: number;
  surface?: "tile" | "advanced" | "configuration";
  onOptionsChange?: (options: Record<string, unknown>) => void;
  onSurfaceChange?: (surface: "tile" | "advanced" | "configuration") => void;
  frozen?: boolean;
  onReady?: (previewId: string) => void;
  onLoadError?: (previewId: string, error: Error) => void;
}) {
  const widgetStateRef = useRef<Record<string, unknown> | null>(null);
  const widgetRuntimeRef = useRef(createWidgetRuntimeState());
  let displayMode: "compact" | "advanced" = "compact";
  if (surface === "advanced") displayMode = "advanced";
  return (
    <TrustedWidgetDisplay
      data={data}
      surface={surface}
      onOptionsChange={onOptionsChange}
      frozen={frozen}
      onReady={onReady}
      onLoadError={onLoadError}
      widget={{
        options: {
          definitionId: data.installationId,
          configuration: data.options,
          configurationVersion: 1,
          connectionBindings: {},
          refreshInterval: 30,
        },
        integrationIds: [],
        itemId: undefined,
        boardId: undefined,
        isEditMode: false,
        displayMode,
        openAdvancedFocus: () => onSurfaceChange?.("advanced"),
        closeAdvancedFocus: () => onSurfaceChange?.("tile"),
        width,
        height,
        displayScale,
        widgetStateRef,
        widgetRuntimeRef,
        setOptions: () => undefined,
      }}
    />
  );
}
