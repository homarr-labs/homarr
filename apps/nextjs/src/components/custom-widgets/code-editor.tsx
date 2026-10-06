"use client";

import { useMemo } from "react";
import type { ComponentProps } from "react";

import { CustomWidgetCodeEditor } from "@homarr/custom-widgets/workbench";
import { invariantTechnicalLabels } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

type SharedEditorProps = ComponentProps<typeof CustomWidgetCodeEditor>;
type CodeEditorProps = Omit<SharedEditorProps, "messages">;

export function CodeEditor(props: CodeEditorProps) {
  const t = useI18n("customWidget.editor");
  const tCommon = useI18n("common");
  const messages = useMemo<SharedEditorProps["messages"]>(
    () => ({
      languageJsx: invariantTechnicalLabels.jsx,
      languageJson: invariantTechnicalLabels.json,
      undo: tCommon("action.undo"),
      redo: t("action.redo"),
      components: t("action.components"),
      componentSearch: t("componentReference.search"),
      componentEmpty: t("componentReference.empty"),
      componentCount: (count) => t("componentReference.count", { count }),
      insertStarter: t("action.insertStarter"),
      format: t("action.format"),
      copy: tCommon("action.copy"),
      copied: t("action.copied"),
      schema: t("action.schema"),
      schemaTab: invariantTechnicalLabels.jsonSchema,
      minimalTab: t("reference.minimal"),
      fullTab: t("reference.full"),
      errors: (count) => t("status.errors", { count }),
      warnings: (count) => t("status.warnings", { count }),
      ready: t("status.ready"),
      position: (cursor) => t("status.position", cursor),
      characters: (count, limit) =>
        limit ? t("status.charactersWithLimit", { count, limit }) : t("status.characters", { count }),
      diagnosticsTitle: t("diagnostics.title"),
      diagnostic: (diagnostic) =>
        `${diagnostic.line ? `${t("diagnostics.line", { line: diagnostic.line })}: ` : ""}${t(
          `diagnostics.${diagnostic.code}` as never,
          { value: diagnostic.value ?? "" } as never,
        )}`,
    }),
    [t, tCommon],
  );
  return <CustomWidgetCodeEditor {...props} messages={messages} />;
}
