"use client";

import { redo, redoDepth, undo, undoDepth } from "@codemirror/commands";
import type { EditorView as EditorViewType } from "@codemirror/view";
import { EditorView } from "@codemirror/view";
import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useState } from "react";
import { Badge, Collapse, Group, Input, Loader, Tabs, Text, useComputedColorScheme } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

import { EditorDiagnostics } from "./code-editor-diagnostics";
import { CodeEditorToolbar } from "./code-editor-toolbar";
import type { EditorDiagnostic } from "./analyzer";
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
const LazyCodeMirror = lazy(() => import("./direct-code-mirror"));
const editorViews = new Map<string, EditorViewType>();

export function CustomWidgetCodeEditor(props: CustomWidgetCodeEditorProps) {
  const editorInstanceId = useId();
  const diagnostics = props.diagnostics ?? EMPTY_DIAGNOSTICS;
  const [editorReady, setEditorReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [referenceOpened, setReferenceOpened] = useState(false);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [editorCreated, setEditorCreated] = useState(false);
  const [historyDepth, setHistoryDepth] = useState({ undo: 0, redo: 0 });
  const colorScheme = useComputedColorScheme("light");
  useEffect(() => {
    setEditorReady(true);
  }, []);
  useEffect(() => {
    const editorView = editorViews.get(editorInstanceId);
    if (!editorView || !props.revealText) return;
    const from = editorView.state.doc.toString().indexOf(props.revealText);
    if (from < 0) return;
    editorView.dispatch({
      selection: { anchor: from, head: from + props.revealText.length },
      effects: EditorView.scrollIntoView(from, { y: "center" }),
    });
    editorView.focus();
  }, [editorCreated, editorInstanceId, props.revealKey, props.revealText]);
  const handleCreateEditor = useCallback(
    (view: EditorViewType) => {
      editorViews.set(editorInstanceId, view);
      window.setTimeout(() => setEditorCreated(true), 0);
    },
    [editorInstanceId],
  );
  const handleDestroyEditor = useCallback(() => {
    editorViews.delete(editorInstanceId);
  }, [editorInstanceId]);
  const selectDiagnostic = useCallback(
    (diagnostic: EditorDiagnostic) => {
      const editorView = editorViews.get(editorInstanceId);
      if (!editorView || diagnostic.index === undefined) return;
      const anchor = Math.min(diagnostic.index, editorView.state.doc.length);
      editorView.dispatch({ selection: { anchor }, scrollIntoView: true });
      editorView.focus();
    },
    [editorInstanceId],
  );
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
          editorCreated={editorCreated}
          historyDepth={historyDepth}
          formattedValue={formattedValue}
          copied={copied}
          referenceOpened={referenceOpened}
          onReferenceToggle={() => setReferenceOpened((value) => !value)}
          onCopy={() => void copy()}
          onUndo={() => {
            const editorView = editorViews.get(editorInstanceId);
            if (editorView) undo(editorView);
          }}
          onRedo={() => {
            const editorView = editorViews.get(editorInstanceId);
            if (editorView) redo(editorView);
          }}
        />
        {props.reference && (
          <Collapse expanded={referenceOpened}>
            <CustomWidgetSchemaReference reference={props.reference} messages={props.messages} />
          </Collapse>
        )}
        <div className={classes.viewport}>
          {editorReady ? (
            <Suspense fallback={<EditorLoader />}>
              <LazyCodeMirror
                id={`${props.id}-root`}
                value={props.value}
                language={props.language}
                diagnostics={diagnostics}
                completions={props.completions ?? []}
                label={props.label}
                placeholder={props.placeholder}
                theme={colorScheme}
                height={props.height ?? (props.language === "jsx" ? "320px" : "220px")}
                readOnly={props.readOnly ?? false}
                diagnosticMessage={props.messages.diagnostic}
                onChange={props.readOnly ? () => undefined : props.onChange}
                onCreateEditor={handleCreateEditor}
                onDestroyEditor={handleDestroyEditor}
                onUpdate={(update) => {
                  if (!update.selectionSet && !update.docChanged) return;
                  const head = update.state.selection.main.head;
                  const line = update.state.doc.lineAt(head);
                  setCursor({ line: line.number, column: head - line.from + 1 });
                  setHistoryDepth({ undo: undoDepth(update.state), redo: redoDepth(update.state) });
                }}
              />
            </Suspense>
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
      <EditorDiagnostics diagnostics={diagnostics} messages={props.messages} onSelect={selectDiagnostic} />
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
