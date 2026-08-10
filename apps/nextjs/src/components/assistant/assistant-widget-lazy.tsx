"use client";

import dynamic from "next/dynamic";

import type { WidgetComponentProps } from "@homarr/widgets";

/**
 * Boards register a renderer for the assistant widget even when no board uses one. Loading the
 * renderer lazily keeps the conversation surface out of the board bundle until a board actually
 * places an assistant widget.
 */
const LazyAssistantBoardWidget = dynamic(() =>
  import("./assistant-widget").then((module) => ({ default: module.AssistantBoardWidget })),
);

export const AssistantBoardWidgetLazy = (props: WidgetComponentProps<"assistant">) => (
  <LazyAssistantBoardWidget {...props} />
);
