"use client";

import type { ComponentProps } from "react";

import { CodeEditor as SharedCodeEditor } from "~/components/custom-widgets/code-editor";

export function CodeEditor(props: ComponentProps<typeof SharedCodeEditor>) {
  const localHistory =
    props.id === "raw-widget-manifest" || props.id.endsWith("-request-body-editor") || props.id.startsWith("option-");
  return (
    <div data-custom-widget-local-history={localHistory || undefined}>
      <SharedCodeEditor {...props} hideHistoryActions={!localHistory} />
    </div>
  );
}
