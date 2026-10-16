"use client";

import type { ComponentProps } from "react";

import { CustomWidgetCodeEditor } from "@homarr/custom-widgets/workbench";

import { useCustomWidgetEditorMessages } from "./use-custom-widget-editor-messages";

type SharedEditorProps = ComponentProps<typeof CustomWidgetCodeEditor>;
type CodeEditorProps = Omit<SharedEditorProps, "messages">;

export function CodeEditor(props: CodeEditorProps) {
  const messages = useCustomWidgetEditorMessages();
  return <CustomWidgetCodeEditor {...props} messages={messages} />;
}
