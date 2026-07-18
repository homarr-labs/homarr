"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { autocompletion } from "@codemirror/autocomplete";
import type { Completion } from "@codemirror/autocomplete";
import { redo, redoDepth, undo, undoDepth } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { linter } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";
import { Badge, Button, Group, Input, Loader, Text, useComputedColorScheme } from "@mantine/core";
import { IconArrowBackUp, IconArrowForwardUp, IconCheck, IconCode, IconFileCode, IconWand } from "@tabler/icons-react";
import { ComponentReference } from "@homarr/custom-widgets/workbench";
import type { EditorDiagnostic } from "@homarr/custom-widgets/workbench";
import { useScopedI18n } from "@homarr/translation/client";

import { CodeEditorDiagnostics } from "./_code-editor-diagnostics";
import { createCustomJsxCompletionSource, customJsxComponentHover } from "./_custom-widget-code-language";
import classes from "./_code-editor.module.css";

const Editor = dynamic(() => import("@uiw/react-codemirror").then((module) => module.default), {
  ssr: false,
  loading: () => (
    <Group justify="center" p="xl">
      <Loader size="sm" />
    </Group>
  ),
});

interface CodeEditorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  description?: string;
  placeholder?: string;
  language: "jsx" | "json";
  diagnostics?: EditorDiagnostic[];
  error?: React.ReactNode;
  required?: boolean;
  maxLength?: number;
  starter?: string;
  completions?: Completion[];
  revealText?: string;
  revealKey?: number;
}

export function CodeEditor({
  id,
  value,
  onChange,
  label,
  description,
  placeholder,
  language,
  diagnostics = [],
  error,
  required,
  maxLength,
  starter,
  completions = [],
  revealText,
  revealKey,
}: CodeEditorProps) {
  const t = useScopedI18n("customWidget.editor");
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [historyDepth, setHistoryDepth] = useState({ undo: 0, redo: 0 });
  const colorScheme = useComputedColorScheme("light");
  const extensions = useMemo(() => {
    const diagnosticsExtension = linter((view) =>
      diagnostics.map((diagnostic) => {
        const from = Math.min(diagnostic.index ?? 0, view.state.doc.length);
        return {
          from,
          to: Math.min(from + 1, view.state.doc.length),
          severity: diagnostic.severity,
          message: t(`diagnostics.${diagnostic.code}` as never, { value: diagnostic.value ?? "" } as never),
        };
      }),
    );
    const accessibilityExtension = EditorView.contentAttributes.of({
      id,
      "aria-label": label,
    });
    return language === "jsx"
      ? [
          javascript({ jsx: true }),
          autocompletion({ override: [createCustomJsxCompletionSource(completions)] }),
          customJsxComponentHover,
          diagnosticsExtension,
          accessibilityExtension,
        ]
      : [json(), diagnosticsExtension, accessibilityExtension];
  }, [completions, diagnostics, id, label, language, t]);
  const errorCount = diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;
  const warningCount = diagnostics.length - errorCount;

  useEffect(() => {
    if (!editorView || !revealText) return;
    const from = editorView.state.doc.toString().indexOf(revealText);
    if (from < 0) return;
    editorView.dispatch({
      selection: { anchor: from, head: from + revealText.length },
      effects: EditorView.scrollIntoView(from, { y: "center" }),
    });
    editorView.focus();
  }, [editorView, revealKey, revealText]);

  const formattedValue = useMemo(() => {
    if (language === "json") {
      try {
        return `${JSON.stringify(JSON.parse(value) as unknown, null, 2)}\n`;
      } catch {
        return value;
      }
    }
    return value
      .replace(/\r\n?/gu, "\n")
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      .trim();
  }, [language, value]);

  return (
    <Input.Wrapper
      label={label}
      description={description}
      error={error}
      required={required}
      labelProps={{ htmlFor: id }}
      inputWrapperOrder={["label", "description", "input", "error"]}
    >
      <div className={classes.root}>
        <Group className={classes.toolbar} justify="space-between" gap="xs" wrap="wrap">
          <Group gap={6}>
            <IconCode size={16} aria-hidden />
            <Text size="xs" fw={600}>
              {language === "jsx" ? t("language.jsx") : t("language.json")}
            </Text>
          </Group>
          <Group gap={6}>
            <Button
              type="button"
              size="compact-xs"
              variant="subtle"
              leftSection={<IconArrowBackUp size={14} />}
              onClick={() => editorView && undo(editorView)}
              disabled={!editorView || historyDepth.undo === 0}
            >
              {t("action.undo")}
            </Button>
            <Button
              type="button"
              size="compact-xs"
              variant="subtle"
              leftSection={<IconArrowForwardUp size={14} />}
              onClick={() => editorView && redo(editorView)}
              disabled={!editorView || historyDepth.redo === 0}
            >
              {t("action.redo")}
            </Button>
            {language === "jsx" && (
              <ComponentReference
                messages={{
                  action: t("action.components"),
                  search: t("componentReference.search"),
                  empty: t("componentReference.empty"),
                  count: (count) => t("componentReference.count", { count }),
                }}
              />
            )}
            {starter && value.trim().length === 0 && (
              <Button
                type="button"
                size="compact-xs"
                variant="subtle"
                leftSection={<IconFileCode size={14} />}
                onClick={() => onChange(starter)}
              >
                {t("action.insertStarter")}
              </Button>
            )}
            <Button
              type="button"
              size="compact-xs"
              variant="subtle"
              leftSection={<IconWand size={14} />}
              onClick={() => onChange(formattedValue)}
              disabled={formattedValue === value}
            >
              {t("action.format")}
            </Button>
          </Group>
        </Group>

        <div className={classes.viewport}>
          <Editor
            id={`${id}-root`}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            extensions={extensions}
            theme={colorScheme}
            height={language === "jsx" ? "320px" : "220px"}
            basicSetup={{
              autocompletion: language !== "jsx",
              bracketMatching: true,
              closeBrackets: true,
              foldGutter: true,
              history: true,
              highlightActiveLine: true,
              highlightActiveLineGutter: true,
              indentOnInput: true,
              lineNumbers: true,
            }}
            onCreateEditor={setEditorView}
            onUpdate={(update) => {
              if (!update.selectionSet && !update.docChanged) return;
              const head = update.state.selection.main.head;
              const line = update.state.doc.lineAt(head);
              setCursor({ line: line.number, column: head - line.from + 1 });
              setHistoryDepth({ undo: undoDepth(update.state), redo: redoDepth(update.state) });
            }}
          />
        </div>

        <Group className={classes.footer} justify="space-between" gap="xs">
          <Group gap={6}>
            {errorCount > 0 ? (
              <Badge size="xs" color="red" variant="light">
                {t("status.errors", { count: errorCount })}
              </Badge>
            ) : warningCount > 0 ? (
              <Badge size="xs" color="yellow" variant="light">
                {t("status.warnings", { count: warningCount })}
              </Badge>
            ) : (
              <Group gap={4}>
                <IconCheck size={13} color="var(--mantine-color-green-6)" aria-hidden />
                <Text size="xs" c="dimmed">
                  {t("status.ready")}
                </Text>
              </Group>
            )}
            <Text size="xs" c="dimmed">
              {t("status.position", cursor)}
            </Text>
          </Group>
          <Text
            size="xs"
            c={maxLength && value.length > maxLength * 0.95 ? (value.length > maxLength ? "red" : "orange") : "dimmed"}
          >
            {maxLength
              ? t("status.charactersWithLimit", { count: value.length, limit: maxLength })
              : t("status.characters", { count: value.length })}
          </Text>
        </Group>
      </div>

      <CodeEditorDiagnostics
        diagnostics={diagnostics}
        editorView={editorView}
        title={t("diagnostics.title")}
        formatDiagnostic={(diagnostic) =>
          `${diagnostic.line ? `${t("diagnostics.line", { line: diagnostic.line })}: ` : ""}${t(
            `diagnostics.${diagnostic.code}` as never,
            { value: diagnostic.value ?? "" } as never,
          )}`
        }
      />
    </Input.Wrapper>
  );
}
