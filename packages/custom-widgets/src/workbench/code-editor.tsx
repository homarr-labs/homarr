"use client";

import { autocompletion } from "@codemirror/autocomplete";
import { redoDepth, undoDepth } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { linter } from "@codemirror/lint";
import type { EditorView as EditorViewType } from "@codemirror/view";
import { EditorView } from "@codemirror/view";
import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactCodeMirrorProps } from "@uiw/react-codemirror";
import { Badge, Collapse, Group, Input, Loader, Tabs, Text, useComputedColorScheme } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

import { createCustomJsxCompletionSource, customJsxComponentHover } from "./code-language";
import { EditorDiagnostics } from "./code-editor-diagnostics";
import { CodeEditorToolbar } from "./code-editor-toolbar";
import type {
  CustomWidgetCodeEditorProps,
  CustomWidgetEditorMessages,
  CustomWidgetSchemaReferenceData,
} from "./code-editor-types";
import classes from "./code-editor.module.css";

export type {
  CustomWidgetCodeEditorProps,
  CustomWidgetEditorMessages,
  CustomWidgetSchemaReferenceData,
} from "./code-editor-types";

const EMPTY_DIAGNOSTICS: NonNullable<CustomWidgetCodeEditorProps["diagnostics"]> = [];

export function CustomWidgetCodeEditor(props: CustomWidgetCodeEditorProps) {
  const diagnostics = props.diagnostics ?? EMPTY_DIAGNOSTICS;
  const [CodeMirror, setCodeMirror] = useState<ComponentType<ReactCodeMirrorProps> | null>(null);
  const [copied, setCopied] = useState(false);
  const [referenceOpened, setReferenceOpened] = useState(false);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [editorView, setEditorView] = useState<EditorViewType | null>(null);
  const [historyDepth, setHistoryDepth] = useState({ undo: 0, redo: 0 });
  const colorScheme = useComputedColorScheme("light");
  useEffect(() => {
    let cancelled = false;
    void import("@uiw/react-codemirror").then((module) => {
      if (!cancelled) setCodeMirror(() => module.default);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const extensions = useMemo(() => {
    const diagnosticsExtension = linter((view) =>
      diagnostics.map((diagnostic) => {
        const from = Math.min(diagnostic.index ?? 0, view.state.doc.length);
        return {
          from,
          to: Math.min(from + 1, view.state.doc.length),
          severity: diagnostic.severity,
          message: props.messages.diagnostic(diagnostic),
        };
      }),
    );
    const accessibilityExtension = EditorView.contentAttributes.of({ id: props.id, "aria-label": props.label });
    const editable = props.readOnly
      ? [EditorView.editable.of(false), EditorView.contentAttributes.of({ tabindex: "0" })]
      : [];
    return props.language === "jsx"
      ? [
          javascript({ jsx: true }),
          autocompletion({ override: [createCustomJsxCompletionSource(props.completions ?? [])] }),
          customJsxComponentHover,
          diagnosticsExtension,
          accessibilityExtension,
          ...editable,
        ]
      : [json(), diagnosticsExtension, accessibilityExtension, ...editable];
  }, [diagnostics, props.completions, props.id, props.label, props.language, props.messages, props.readOnly]);
  useEffect(() => {
    if (!editorView || !props.revealText) return;
    const from = editorView.state.doc.toString().indexOf(props.revealText);
    if (from < 0) return;
    editorView.dispatch({
      selection: { anchor: from, head: from + props.revealText.length },
      effects: EditorView.scrollIntoView(from, { y: "center" }),
    });
    editorView.focus();
  }, [editorView, props.revealKey, props.revealText]);
  const handleCreateEditor = useCallback((view: EditorViewType) => {
    // @uiw invokes this while constructing CodeMirror. Deferring the parent update avoids
    // re-entering React's renderer during initialisation in Next.js and Docusaurus.
    window.setTimeout(() => setEditorView(view), 0);
  }, []);
  const formattedValue = useMemo(() => formatCode(props.value, props.language), [props.language, props.value]);
  const errorCount = diagnostics.filter(({ severity }) => severity === "error").length;
  const warningCount = diagnostics.length - errorCount;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(props.value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <Input.Wrapper
      label={props.label}
      description={props.description}
      error={props.error}
      required={props.required}
      labelProps={{ htmlFor: props.id }}
      inputWrapperOrder={["label", "description", "input", "error"]}
    >
      <div className={classes.root}>
        <CodeEditorToolbar
          props={props}
          editorView={editorView}
          historyDepth={historyDepth}
          formattedValue={formattedValue}
          copied={copied}
          referenceOpened={referenceOpened}
          onReferenceToggle={() => setReferenceOpened((value) => !value)}
          onCopy={() => void copy()}
        />
        {props.reference && (
          <Collapse expanded={referenceOpened}>
            <CustomWidgetSchemaReference reference={props.reference} messages={props.messages} />
          </Collapse>
        )}
        <div className={classes.viewport}>
          {CodeMirror ? (
            <CodeMirror
              id={`${props.id}-root`}
              value={props.value}
              onChange={props.readOnly ? () => undefined : props.onChange}
              placeholder={props.placeholder}
              extensions={extensions}
              theme={colorScheme}
              height={props.height ?? (props.language === "jsx" ? "320px" : "220px")}
              basicSetup={{
                autocompletion: props.language !== "jsx" && !props.readOnly,
                bracketMatching: true,
                closeBrackets: !props.readOnly,
                foldGutter: true,
                history: !props.readOnly,
                highlightActiveLine: !props.readOnly,
                highlightActiveLineGutter: !props.readOnly,
                indentOnInput: !props.readOnly,
                lineNumbers: true,
              }}
              onCreateEditor={handleCreateEditor}
              onUpdate={(update) => {
                if (!editorView) return;
                if (!update.selectionSet && !update.docChanged) return;
                const head = update.state.selection.main.head;
                const line = update.state.doc.lineAt(head);
                setCursor({ line: line.number, column: head - line.from + 1 });
                setHistoryDepth({ undo: undoDepth(update.state), redo: redoDepth(update.state) });
              }}
            />
          ) : (
            <EditorLoader />
          )}
        </div>
        <Group className={classes.footer} justify="space-between" gap="xs">
          <Group gap={6}>
            {errorCount > 0 ? (
              <Badge size="xs" color="red" variant="light">
                {props.messages.errors(errorCount)}
              </Badge>
            ) : warningCount > 0 ? (
              <Badge size="xs" color="yellow" variant="light">
                {props.messages.warnings(warningCount)}
              </Badge>
            ) : (
              <Group gap={4}>
                <IconCheck size={13} color="var(--mantine-color-green-6)" aria-hidden />
                <Text size="xs" c="dimmed">
                  {props.messages.ready}
                </Text>
              </Group>
            )}
            <Text size="xs" c="dimmed">
              {props.messages.position(cursor)}
            </Text>
          </Group>
          <Text size="xs" c={props.maxLength && props.value.length > props.maxLength ? "red" : "dimmed"}>
            {props.messages.characters(props.value.length, props.maxLength)}
          </Text>
        </Group>
      </div>
      <EditorDiagnostics diagnostics={diagnostics} editorView={editorView} messages={props.messages} />
    </Input.Wrapper>
  );
}

export function ReadOnlyCustomWidgetCode(props: Omit<CustomWidgetCodeEditorProps, "onChange" | "readOnly">) {
  return <CustomWidgetCodeEditor {...props} readOnly onChange={() => undefined} />;
}

export function CustomWidgetSchemaReference({
  reference,
  messages,
}: {
  reference: CustomWidgetSchemaReferenceData;
  messages: CustomWidgetEditorMessages;
}) {
  const values = { schema: reference.schema, minimal: reference.minimal, full: reference.full };
  const labels = { schema: messages.schemaTab, minimal: messages.minimalTab, full: messages.fullTab };
  return (
    <Tabs defaultValue="schema" className={classes.reference}>
      <Tabs.List>
        <Tabs.Tab value="schema">{messages.schemaTab}</Tabs.Tab>
        <Tabs.Tab value="minimal">{messages.minimalTab}</Tabs.Tab>
        <Tabs.Tab value="full">{messages.fullTab}</Tabs.Tab>
      </Tabs.List>
      {Object.entries(values).map(([key, value]) => (
        <Tabs.Panel key={key} value={key} pt="xs">
          <ReadOnlyCustomWidgetCode
            id={`schema-reference-${key}`}
            label={labels[key as keyof typeof labels]}
            language="json"
            value={JSON.stringify(value, null, 2)}
            messages={messages}
            height="280px"
          />
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}

function EditorLoader() {
  return (
    <Group justify="center" p="xl">
      <Loader size="sm" />
    </Group>
  );
}
function formatCode(value: string, language: "jsx" | "json") {
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
}
