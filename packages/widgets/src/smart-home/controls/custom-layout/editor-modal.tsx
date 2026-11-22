"use client";

import { lazy, Suspense } from "react";
import { Center, Loader } from "@mantine/core";

import { createModal } from "@homarr/modals";

import type { SmartHomeLayout } from "./schema";

export interface SmartHomeLayoutEditorProps {
  integrationId: string;
  layout: SmartHomeLayout;
  onSave: (layout: SmartHomeLayout) => void;
  /** The widget's content size, so the canvas shows the layout exactly as wide and marks where it ends. */
  previewSize?: { width: number; height: number };
}

// Drag and drop, templates and entity pickers load only when someone opens the editor.
const LayoutEditor = lazy(() => import("./editor"));

export const SmartHomeLayoutEditorModal = createModal<SmartHomeLayoutEditorProps>(({ innerProps, actions }) => (
  <Suspense
    fallback={
      <Center h={320}>
        <Loader size="sm" />
      </Center>
    }
  >
    <LayoutEditor {...innerProps} onClose={actions.closeModal} />
  </Suspense>
)).withOptions({
  defaultTitle: (t) => t("widget.smartHome-controls.layout.editor.title"),
  size: 1400,
  // Opened from the docked widget settings, the dialog otherwise starts where the panel starts.
  styles: { inner: { left: 0, right: 0 } },
  // The editor holds unsaved work: Escape (which also closes its popovers) or a stray click must not discard it.
  closeOnEscape: false,
  closeOnClickOutside: false,
});
