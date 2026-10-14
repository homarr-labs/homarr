import { useMemo } from "react";
import type { ComponentProps } from "react";

import type { WidgetEditorBindings } from "../../features/widgets-editor/contracts";
import { useI18n, useWorkbenchBindings } from "./workbench-context";

type SharedEditorProps = ComponentProps<NonNullable<WidgetEditorBindings["CodeEditor"]>>;
export type CodeEditorProps = Omit<SharedEditorProps, "messages">;

export function CodeEditor(props: CodeEditorProps) {
  const { CodeEditor: Editor, disabled } = useWorkbenchBindings();
  const t = useI18n("customWidget.editor");
  const tCommon = useI18n("common");
  const messages = useMemo<SharedEditorProps["messages"]>(
    () => ({
      languageJsx: "JSX",
      languageJson: "JSON",
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
      schemaTab: "JSON Schema",
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
        `${diagnostic.line ? `${t("diagnostics.line", { line: diagnostic.line })}: ` : ""}${t(`diagnostics.${diagnostic.code}`, { value: diagnostic.value ?? "" })}`,
    }),
    [t, tCommon],
  );
  return <Editor {...props} readOnly={disabled || props.readOnly} messages={messages} />;
}
