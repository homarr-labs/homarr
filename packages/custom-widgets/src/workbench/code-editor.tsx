"use client";

import { indentSelection, redo, redoDepth, undo, undoDepth } from "@codemirror/commands";
import type { EditorView as EditorViewType, ViewUpdate } from "@codemirror/view";
import { EditorView } from "@codemirror/view";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
const EMPTY_COMPLETIONS: NonNullable<CustomWidgetCodeEditorProps["completions"]> = [];
const LazyCodeMirror = lazy(() => import("./direct-code-mirror"));

export function CustomWidgetCodeEditor(props: CustomWidgetCodeEditorProps) {
  const editorViewRef = useRef<EditorViewType>(null);
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
    const editorView = editorViewRef.current;
    if (!editorView || !props.revealText) return;
    const from = editorView.state.doc.toString().indexOf(props.revealText);
    if (from < 0) return;
    editorView.dispatch({
      selection: { anchor: from, head: from + props.revealText.length },
      effects: EditorView.scrollIntoView(from, { y: "center" }),
    });
    editorView.focus();
  }, [editorCreated, props.revealKey, props.revealText]);
  useEffect(() => {
    const editorView = editorViewRef.current;
    if (!editorView || !props.insertText) return;
    const selection = editorView.state.selection.main;
    editorView.dispatch({
      changes: { from: selection.from, to: selection.to, insert: props.insertText },
      selection: { anchor: selection.from + props.insertText.length },
      scrollIntoView: true,
    });
    editorView.focus();
  }, [editorCreated, props.insertKey, props.insertText]);
  const handleCreateEditor = useCallback((view: EditorViewType) => {
    editorViewRef.current = view;
    window.setTimeout(() => {
      if (editorViewRef.current === view) setEditorCreated(true);
    }, 0);
  }, []);
  const handleDestroyEditor = useCallback((view: EditorViewType) => {
    if (editorViewRef.current !== view) return;
    editorViewRef.current = null;
    setEditorCreated(false);
    setCursor({ line: 1, column: 1 });
    setHistoryDepth({ undo: 0, redo: 0 });
  }, []);
  const handleUndo = useCallback(() => {
    const editorView = editorViewRef.current;
    if (!editorView) return;
    undo(editorView);
    editorView.focus();
  }, []);
  const handleRedo = useCallback(() => {
    const editorView = editorViewRef.current;
    if (!editorView) return;
    redo(editorView);
    editorView.focus();
  }, []);
  const handleUpdate = useCallback((update: ViewUpdate) => {
    if (!update.selectionSet && !update.docChanged) return;
    const head = update.state.selection.main.head;
    const line = update.state.doc.lineAt(head);
    setCursor({ line: line.number, column: head - line.from + 1 });
    setHistoryDepth({ undo: undoDepth(update.state), redo: redoDepth(update.state) });
  }, []);
  const selectDiagnostic = useCallback((diagnostic: EditorDiagnostic) => {
    const editorView = editorViewRef.current;
    if (!editorView || diagnostic.index === undefined) return;
    const anchor = Math.min(diagnostic.index, editorView.state.doc.length);
    editorView.dispatch({ selection: { anchor }, scrollIntoView: true });
    editorView.focus();
  }, []);
  const formattedValue = useMemo(() => formatCode(props.value, props.language), [props.language, props.value]);
  const errorCount = diagnostics.filter(({ severity }) => severity === "error").length;
  const warningCount = diagnostics.length - errorCount;
  const isCharacterLimitExceeded = props.maxLength !== undefined && props.value.length > props.maxLength;
  const isEditorInvalid = Boolean(props.error) || errorCount > 0 || isCharacterLimitExceeded;
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
      labelProps={{ id: `${props.id}-label`, htmlFor: props.id }}
      descriptionProps={{ className: classes.accessibleMuted }}
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
          onUndo={handleUndo}
          onRedo={handleRedo}
          onFormat={() => {
            const editorView = editorViewRef.current;
            if (props.language === "jsx" && editorView) {
              const selection = editorView.state.selection.main;
              editorView.dispatch({ selection: { anchor: 0, head: editorView.state.doc.length } });
              indentSelection(editorView);
              const documentLength = editorView.state.doc.length;
              editorView.dispatch({
                selection: {
                  anchor: Math.min(selection.anchor, documentLength),
                  head: Math.min(selection.head, documentLength),
                },
              });
            } else {
              props.onChange(formattedValue);
            }
          }}
        />
        {props.reference && (
          <Collapse expanded={referenceOpened}>
            <CustomWidgetSchemaReference
              id={`${props.id}-schema-reference`}
              reference={props.reference}
              messages={props.messages}
            />
          </Collapse>
        )}
        <div className={classes.viewport}>
          {editorReady ? (
            <Suspense fallback={<EditorLoader />}>
              <LazyCodeMirror
                id={props.id}
                labelledBy={`${props.id}-label`}
                value={props.value}
                language={props.language}
                diagnostics={diagnostics}
                completions={props.completions ?? EMPTY_COMPLETIONS}
                label={props.label}
                placeholder={props.placeholder}
                theme={colorScheme}
                invalid={isEditorInvalid}
                height={props.height ?? (props.language === "jsx" ? "320px" : "220px")}
                readOnly={props.readOnly ?? false}
                diagnosticMessage={props.messages.diagnostic}
                onChange={props.readOnly ? () => undefined : props.onChange}
                onCreateEditor={handleCreateEditor}
                onDestroyEditor={handleDestroyEditor}
                onUpdate={handleUpdate}
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
                <Text size="xs" className={classes.accessibleMuted}>
                  {props.messages.ready}
                </Text>
              </Group>
            )}
            <Text size="xs" className={classes.accessibleMuted}>
              {props.messages.position(cursor)}
            </Text>
          </Group>
          <Text
            component="output"
            size="xs"
            className={classes.accessibleMuted}
            data-invalid={isCharacterLimitExceeded}
            aria-live="polite"
          >
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
  id,
  reference,
  messages,
}: {
  id: string;
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
            id={`${id}-${key}`}
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
function formatCode(value: string, language: "jsx" | "json" | "css") {
  if (language === "json") {
    try {
      const parsed: unknown = JSON.parse(value);
      return `${JSON.stringify(parsed, null, 2)}\n`;
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
