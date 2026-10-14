import { useId } from "react";
import type { ComponentType } from "react";
import { Alert } from "@mantine/core";

import { invariantTechnicalLabels } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import type {
  CustomWidgetCodeEditorProps,
  CustomWidgetEditorMessages,
} from "../../../../../packages/custom-widgets/src/workbench/code-editor-types";

export function WorkshopCodeViewer({
  value,
  language,
  height = "360px",
  code: Code,
}: {
  value: string;
  language: "json" | "css";
  height?: string;
  code?: ComponentType<Omit<CustomWidgetCodeEditorProps, "onChange" | "readOnly">>;
}) {
  const id = useId();
  const t = useI18n("customWidget.editor");
  const common = useI18n("common");
  const workshop = useI18n("workshop");
  const messages: CustomWidgetEditorMessages = {
    languageJsx: invariantTechnicalLabels.jsx,
    languageJson: invariantTechnicalLabels.json,
    undo: common("action.undo"),
    redo: t("action.redo"),
    components: t("action.components"),
    componentSearch: t("componentReference.search"),
    componentEmpty: t("componentReference.empty"),
    componentCount: (count) => t("componentReference.count", { count }),
    insertStarter: t("action.insertStarter"),
    format: t("action.format"),
    copy: common("action.copy"),
    copied: t("action.copied"),
    schema: t("action.schema"),
    schemaTab: invariantTechnicalLabels.jsonSchema,
    minimalTab: t("reference.minimal"),
    fullTab: t("reference.full"),
    errors: (count) => t("status.errors", { count }),
    warnings: (count) => t("status.warnings", { count }),
    ready: t("status.ready"),
    position: (cursor) => t("status.position", cursor),
    characters: (count, limit) => {
      if (limit) return t("status.charactersWithLimit", { count, limit });
      return t("status.characters", { count });
    },
    diagnosticsTitle: t("diagnostics.title"),
    diagnostic: (diagnostic) => diagnostic.value ?? diagnostic.code,
  };
  let displayValue = value;
  if (language === "json") {
    try {
      const parsed: unknown = JSON.parse(value);
      displayValue = JSON.stringify(parsed, null, 2);
    } catch {}
  }
  if (!Code)
    return (
      <Alert color="yellow">
        The original read-only code editor has not been joined. Source inspection is unavailable.
      </Alert>
    );
  return (
    <Code
      id={`workshop-source-${id}`}
      label={workshop("sourceCode")}
      language={language}
      value={displayValue}
      messages={messages}
      height={height}
    />
  );
}
