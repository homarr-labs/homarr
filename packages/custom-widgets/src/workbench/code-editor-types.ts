import type { Completion } from "@codemirror/autocomplete";
import type { ReactNode } from "react";

import type { EditorDiagnostic } from "./analyzer";

export interface CustomWidgetEditorMessages {
  languageJsx: string;
  languageJson: string;
  undo: string;
  redo: string;
  components: string;
  componentSearch: string;
  componentEmpty: string;
  componentCount(count: number): string;
  insertStarter: string;
  format: string;
  copy: string;
  copied: string;
  schema: string;
  schemaTab: string;
  minimalTab: string;
  fullTab: string;
  errors(count: number): string;
  warnings(count: number): string;
  ready: string;
  position(cursor: { line: number; column: number }): string;
  characters(count: number, limit?: number): string;
  diagnosticsTitle: string;
  diagnostic(diagnostic: EditorDiagnostic): string;
}

export interface CustomWidgetSchemaReferenceData {
  schema: unknown;
  minimal: unknown;
  full: unknown;
}

export interface CustomWidgetCodeEditorProps {
  id: string;
  value: string;
  onChange(value: string): void;
  label: string;
  messages: CustomWidgetEditorMessages;
  description?: string;
  placeholder?: string;
  language: "jsx" | "json";
  diagnostics?: EditorDiagnostic[];
  error?: ReactNode;
  required?: boolean;
  maxLength?: number;
  starter?: string;
  completions?: Completion[];
  revealText?: string;
  revealKey?: number;
  insertText?: string;
  insertKey?: number;
  readOnly?: boolean;
  reference?: CustomWidgetSchemaReferenceData;
  height?: string;
}
