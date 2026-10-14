"use client";

import type { ComponentType } from "react";

import type { CustomJsxRendererProps, CustomWidgetPublishedQueryState } from "@homarr/custom-widgets/runtime";

export interface CustomJsxPresentationProps extends Omit<CustomJsxRendererProps, "data" | "status"> {
  renderer: ComponentType<CustomJsxRendererProps>;
  data: Record<string, unknown>;
  status: Record<string, unknown>;
  queryState: Record<string, CustomWidgetPublishedQueryState>;
}

export function CustomJsxPresentation({
  renderer: Renderer,
  template,
  data,
  status,
  queryState,
  options,
  components,
  createBindings,
  messages,
}: CustomJsxPresentationProps) {
  return (
    <Renderer
      template={template}
      data={{ ...data, ...Object.fromEntries(Object.entries(queryState).map(([id, value]) => [id, value.data])) }}
      status={{ ...status, ...Object.fromEntries(Object.entries(queryState).map(([id, value]) => [id, value.status])) }}
      options={options}
      components={components}
      createBindings={createBindings}
      messages={messages}
    />
  );
}
