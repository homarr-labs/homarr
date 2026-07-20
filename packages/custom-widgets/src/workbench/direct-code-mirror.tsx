"use client";

import { autocompletion } from "@codemirror/autocomplete";
import { indentWithTab } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { linter } from "@codemirror/lint";
import { EditorState, StateEffect } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, keymap, placeholder as codeMirrorPlaceholder } from "@codemirror/view";
import type { ViewUpdate } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { useCallback, useEffect, useId, useState } from "react";
import type { Completion } from "@codemirror/autocomplete";

import { createCustomJsxCompletionSource, customJsxComponentHover } from "./code-language";
import type { EditorDiagnostic } from "./analyzer";

interface DirectCodeMirrorProps {
  value: string;
  language: "jsx" | "json";
  diagnostics: EditorDiagnostic[];
  completions: Completion[];
  id: string;
  label: string;
  placeholder?: string;
  height: string;
  theme: "light" | "dark";
  readOnly: boolean;
  diagnosticMessage(diagnostic: EditorDiagnostic): string;
  onChange(value: string): void;
  onCreateEditor(view: EditorView): void;
  onDestroyEditor(): void;
  onUpdate(update: ViewUpdate): void;
}

interface EditorCallbacks {
  onChange(value: string): void;
  onUpdate(update: ViewUpdate): void;
}

const editorViews = new Map<string, EditorView>();
const editorCallbacks = new Map<string, EditorCallbacks>();
const editorContainers = new Map<string, HTMLDivElement>();

export default function DirectCodeMirror(props: DirectCodeMirrorProps) {
  const instanceId = useId();
  const [initialProps] = useState(props);
  const [containerReady, setContainerReady] = useState(false);
  const setContainer = useCallback(
    (container: HTMLDivElement | null) => {
      if (!container) {
        editorContainers.delete(instanceId);
        return;
      }
      editorContainers.set(instanceId, container);
      setContainerReady(true);
    },
    [instanceId],
  );

  useEffect(() => {
    editorCallbacks.set(instanceId, { onChange: props.onChange, onUpdate: props.onUpdate });
  }, [instanceId, props.onChange, props.onUpdate]);

  useEffect(() => {
    const parent = editorContainers.get(instanceId);
    if (!parent) return;
    const view = new EditorView({
      parent,
      state: EditorState.create({ doc: initialProps.value, extensions: createExtensions(instanceId, initialProps) }),
    });
    editorViews.set(instanceId, view);
    initialProps.onCreateEditor(view);
    return () => {
      editorViews.delete(instanceId);
      editorCallbacks.delete(instanceId);
      initialProps.onDestroyEditor();
      view.destroy();
    };
  }, [containerReady, initialProps, instanceId]);

  useEffect(() => {
    const view = editorViews.get(instanceId);
    if (!view || view.state.doc.toString() === props.value) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: props.value } });
  }, [instanceId, props.value]);

  useEffect(() => {
    const view = editorViews.get(instanceId);
    if (!view) return;
    view.dispatch({ effects: StateEffect.reconfigure.of(createExtensions(instanceId, props)) });
  }, [instanceId, props]);

  return <div ref={setContainer} />;
}

function createExtensions(instanceId: string, props: DirectCodeMirrorProps) {
  const language =
    props.language === "jsx"
      ? [
          javascript({ jsx: true }),
          autocompletion({ override: [createCustomJsxCompletionSource(props.completions)] }),
          customJsxComponentHover,
        ]
      : [json()];
  return [
    basicSetup,
    ...language,
    linter((view) =>
      props.diagnostics.map((diagnostic) => {
        const from = Math.min(diagnostic.index ?? 0, view.state.doc.length);
        return {
          from,
          to: Math.min(from + 1, view.state.doc.length),
          severity: diagnostic.severity,
          message: props.diagnosticMessage(diagnostic),
        };
      }),
    ),
    EditorView.contentAttributes.of({ id: props.id, "aria-label": props.label }),
    EditorView.editable.of(!props.readOnly),
    EditorState.readOnly.of(props.readOnly),
    keymap.of(props.readOnly ? [] : [indentWithTab]),
    props.placeholder ? codeMirrorPlaceholder(props.placeholder) : [],
    EditorView.theme({ "&": { height: props.height }, ".cm-scroller": { overflow: "auto" } }),
    props.theme === "dark" ? oneDark : [],
    EditorView.updateListener.of((update) => {
      const callbacks = editorCallbacks.get(instanceId);
      if (!callbacks) return;
      if (update.docChanged) callbacks.onChange(update.state.doc.toString());
      callbacks.onUpdate(update);
    }),
  ];
}
