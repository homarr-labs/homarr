"use client";

import { autocompletion } from "@codemirror/autocomplete";
import { indentWithTab } from "@codemirror/commands";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { linter } from "@codemirror/lint";
import { Annotation, Compartment, EditorSelection, EditorState, Transaction } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, keymap, placeholder as codeMirrorPlaceholder } from "@codemirror/view";
import type { ViewUpdate } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { useEffect, useId, useRef, useState } from "react";
import type { Completion } from "@codemirror/autocomplete";

import { createCustomJsxCompletionSource, customJsxComponentHover } from "./code-language";
import type { EditorDiagnostic } from "./analyzer";

interface DirectCodeMirrorProps {
  value: string;
  language: "jsx" | "json" | "css";
  diagnostics: EditorDiagnostic[];
  completions: Completion[];
  id: string;
  label: string;
  labelledBy: string;
  placeholder?: string;
  height: string;
  theme: "light" | "dark";
  invalid: boolean;
  readOnly: boolean;
  diagnosticMessage(diagnostic: EditorDiagnostic): string;
  onChange(value: string): void;
  onCreateEditor(view: EditorView): void;
  onDestroyEditor(view: EditorView): void;
  onUpdate(update: ViewUpdate): void;
}

interface EditorCallbacks {
  onChange(value: string): void;
  onUpdate(update: ViewUpdate): void;
}

interface EditorCompartments {
  language: Compartment;
  diagnostics: Compartment;
  accessibility: Compartment;
  editability: Compartment;
  placeholder: Compartment;
  height: Compartment;
  theme: Compartment;
}

const editorViews = new Map<string, EditorView>();
const editorCallbacks = new Map<string, EditorCallbacks>();
const controlledValueUpdate = Annotation.define<boolean>();

export default function DirectCodeMirror(props: DirectCodeMirrorProps) {
  const instanceId = useId();
  const [initialProps] = useState(props);
  const [compartments] = useState(createEditorCompartments);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    editorCallbacks.set(instanceId, { onChange: props.onChange, onUpdate: props.onUpdate });
  }, [instanceId, props.onChange, props.onUpdate]);

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: initialProps.value,
        extensions: createExtensions(instanceId, initialProps, compartments),
      }),
    });
    editorViews.set(instanceId, view);
    initialProps.onCreateEditor(view);
    return () => {
      if (editorViews.get(instanceId) === view) {
        editorViews.delete(instanceId);
        editorCallbacks.delete(instanceId);
      }
      initialProps.onDestroyEditor(view);
      view.destroy();
    };
  }, [compartments, initialProps, instanceId]);

  useEffect(() => {
    const view = editorViews.get(instanceId);
    if (!view || view.state.doc.toString() === props.value) return;
    const documentLength = props.value.length;
    const selection = EditorSelection.create(
      view.state.selection.ranges.map((range) =>
        EditorSelection.range(Math.min(range.anchor, documentLength), Math.min(range.head, documentLength)),
      ),
      view.state.selection.mainIndex,
    );
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: props.value },
      selection,
      annotations: [Transaction.addToHistory.of(false), controlledValueUpdate.of(true)],
    });
  }, [instanceId, props.value]);

  useEffect(() => {
    reconfigure(instanceId, compartments.language, createLanguageExtension(props.language, props.completions));
  }, [compartments.language, instanceId, props.completions, props.language]);
  useEffect(() => {
    reconfigure(
      instanceId,
      compartments.diagnostics,
      createDiagnosticsExtension(props.diagnostics, props.diagnosticMessage),
    );
  }, [compartments.diagnostics, instanceId, props.diagnosticMessage, props.diagnostics]);
  useEffect(() => {
    reconfigure(
      instanceId,
      compartments.accessibility,
      EditorView.contentAttributes.of({
        id: props.id,
        tabindex: "0",
        "aria-label": props.label,
        "aria-labelledby": props.labelledBy,
        "aria-invalid": props.invalid.toString(),
      }),
    );
  }, [compartments.accessibility, instanceId, props.id, props.invalid, props.label, props.labelledBy]);
  useEffect(() => {
    reconfigure(instanceId, compartments.editability, createEditabilityExtension(props.readOnly));
  }, [compartments.editability, instanceId, props.readOnly]);
  useEffect(() => {
    reconfigure(instanceId, compartments.placeholder, createPlaceholderExtension(props.placeholder));
  }, [compartments.placeholder, instanceId, props.placeholder]);
  useEffect(() => {
    reconfigure(instanceId, compartments.height, createHeightExtension(props.height));
  }, [compartments.height, instanceId, props.height]);
  useEffect(() => {
    reconfigure(instanceId, compartments.theme, createThemeExtension(props.theme));
  }, [compartments.theme, instanceId, props.theme]);

  return <div ref={containerRef} />;
}

function createEditorCompartments(): EditorCompartments {
  return {
    language: new Compartment(),
    diagnostics: new Compartment(),
    accessibility: new Compartment(),
    editability: new Compartment(),
    placeholder: new Compartment(),
    height: new Compartment(),
    theme: new Compartment(),
  };
}

function createExtensions(instanceId: string, props: DirectCodeMirrorProps, compartments: EditorCompartments) {
  return [
    basicSetup,
    compartments.language.of(createLanguageExtension(props.language, props.completions)),
    compartments.diagnostics.of(createDiagnosticsExtension(props.diagnostics, props.diagnosticMessage)),
    compartments.accessibility.of(
      EditorView.contentAttributes.of({
        id: props.id,
        tabindex: "0",
        "aria-label": props.label,
        "aria-labelledby": props.labelledBy,
        "aria-invalid": props.invalid.toString(),
      }),
    ),
    compartments.editability.of(createEditabilityExtension(props.readOnly)),
    compartments.placeholder.of(createPlaceholderExtension(props.placeholder)),
    compartments.height.of(createHeightExtension(props.height)),
    compartments.theme.of(createThemeExtension(props.theme)),
    EditorView.updateListener.of((update) => {
      const callbacks = editorCallbacks.get(instanceId);
      if (!callbacks) return;
      const isControlledValueUpdate = update.transactions.some(
        (transaction) => transaction.annotation(controlledValueUpdate) === true,
      );
      if (update.docChanged && !isControlledValueUpdate) callbacks.onChange(update.state.doc.toString());
      callbacks.onUpdate(update);
    }),
  ];
}

function createLanguageExtension(language: DirectCodeMirrorProps["language"], completions: Completion[]): Extension {
  if (language === "jsx") {
    return [
      javascript({ jsx: true }),
      autocompletion({ override: [createCustomJsxCompletionSource(completions)] }),
      customJsxComponentHover,
    ];
  }
  if (language === "css") return css();
  return json();
}

function createDiagnosticsExtension(
  diagnostics: EditorDiagnostic[],
  diagnosticMessage: DirectCodeMirrorProps["diagnosticMessage"],
): Extension {
  return linter((view) =>
    diagnostics.map((diagnostic) => {
      const from = Math.min(diagnostic.index ?? 0, view.state.doc.length);
      return {
        from,
        to: Math.min(from + 1, view.state.doc.length),
        severity: diagnostic.severity,
        message: diagnosticMessage(diagnostic),
      };
    }),
  );
}

function createEditabilityExtension(readOnly: boolean): Extension {
  return [
    EditorView.editable.of(!readOnly),
    EditorState.readOnly.of(readOnly),
    keymap.of(readOnly ? [] : [indentWithTab]),
  ];
}

function createPlaceholderExtension(placeholder: string | undefined): Extension {
  if (!placeholder) return [];
  return codeMirrorPlaceholder(placeholder);
}

function createHeightExtension(height: string): Extension {
  return EditorView.theme({ "&": { height }, ".cm-scroller": { overflow: "auto" } });
}

function createThemeExtension(theme: DirectCodeMirrorProps["theme"]): Extension {
  if (theme === "dark") return oneDark;
  return [];
}

function reconfigure(instanceId: string, compartment: Compartment, extension: Extension) {
  const view = editorViews.get(instanceId);
  if (!view) return;
  view.dispatch({ effects: compartment.reconfigure(extension) });
}
