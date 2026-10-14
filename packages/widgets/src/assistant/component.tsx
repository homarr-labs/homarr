"use client";

import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { useAssistantWidgetRenderer } from "./context";
import { AssistantUnavailableView } from "./native-view";

export default function AssistantWidget(props: WidgetComponentProps<"assistant">) {
  const Renderer = useAssistantWidgetRenderer();
  const t = useI18n("widget.assistant.unavailable");

  if (Renderer) return <Renderer {...props} />;

  return <AssistantUnavailableView title={t("title")} description={t("description")} />;
}
