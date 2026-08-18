"use client";

import { useId } from "react";

import { ReadOnlyCustomWidgetCode } from "@homarr/custom-widgets/workbench";
import type { CustomWidgetEditorMessages } from "@homarr/custom-widgets/workbench";
import { useScopedI18n } from "@homarr/translation/client";

/** Read-only source view of a Workshop submission, used for both widget JSON and Custom CSS. */
export function WorkshopCodeViewer({
  value,
  language,
  height = "360px",
}: {
  value: string;
  language: "json" | "css";
  height?: string;
}) {
  const id = useId();
  const t = useScopedI18n("customWidget.editor");
  const workshopT = useScopedI18n("workshop");
  const messages: CustomWidgetEditorMessages = {
    languageJsx: t("language.jsx"),
    languageJson: t("language.json"),
    undo: t("action.undo"),
    redo: t("action.redo"),
    components: t("action.components"),
    componentSearch: t("componentReference.search"),
    componentEmpty: t("componentReference.empty"),
    componentCount: (count) => t("componentReference.count", { count }),
    insertStarter: t("action.insertStarter"),
    format: t("action.format"),
    copy: t("action.copy"),
    copied: t("action.copied"),
    schema: t("action.schema"),
    schemaTab: t("reference.schema"),
    minimalTab: t("reference.minimal"),
    fullTab: t("reference.full"),
    errors: (count) => t("status.errors", { count }),
    warnings: (count) => t("status.warnings", { count }),
    ready: t("status.ready"),
    position: (cursor) => t("status.position", cursor),
    characters: (count, limit) =>
      limit ? t("status.charactersWithLimit", { count, limit }) : t("status.characters", { count }),
    diagnosticsTitle: t("diagnostics.title"),
    diagnostic: (diagnostic) => diagnostic.value ?? diagnostic.code,
  };

  let displayValue = value;
  if (language === "json") {
    try {
      displayValue = JSON.stringify(JSON.parse(value) as unknown, null, 2);
    } catch {}
  }

  return (
    <ReadOnlyCustomWidgetCode
      id={`workshop-source-${id}`}
      label={workshopT("sourceCode")}
      language={language}
      value={displayValue}
      messages={messages}
      height={height}
    />
  );
}
