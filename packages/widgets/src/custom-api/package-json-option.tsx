"use client";

import { useEffect, useRef, useState } from "react";
import { CustomWidgetCodeEditor } from "@homarr/custom-widgets/workbench";
import type { CustomWidgetEditorMessages } from "@homarr/custom-widgets/workbench";

const editorMessages: CustomWidgetEditorMessages = {
  languageJsx: "JSX",
  languageJson: "JSON",
  undo: "Undo",
  redo: "Redo",
  components: "Components",
  componentSearch: "Search components",
  componentEmpty: "No components",
  componentCount: (count) => `${count} components`,
  insertStarter: "Insert starter",
  format: "Format",
  copy: "Copy",
  copied: "Copied",
  schema: "Schema",
  schemaTab: "JSON Schema",
  minimalTab: "Minimal",
  fullTab: "Full",
  errors: (count) => `${count} errors`,
  warnings: (count) => `${count} warnings`,
  ready: "Ready",
  position: ({ line, column }) => `Ln ${line}, Col ${column}`,
  characters: (count, limit) => (limit ? `${count} / ${limit}` : `${count} characters`),
  diagnosticsTitle: "Diagnostics",
  diagnostic: (diagnostic) => diagnostic.value ?? diagnostic.code,
};

export function JsonOption({
  identity,
  editorId,
  label,
  description,
  value,
  onChange,
}: {
  identity: string;
  editorId: string;
  label: string;
  description?: string;
  value: unknown;
  onChange(value: unknown): void;
}) {
  const serializedValue = JSON.stringify(value ?? null, null, 2);
  const [draft, setDraft] = useState(serializedValue);
  const [error, setError] = useState<string>();
  const synchronizedValueRef = useRef(serializedValue);
  const identityRef = useRef(identity);
  useEffect(() => {
    if (identityRef.current === identity && synchronizedValueRef.current === serializedValue) return;
    identityRef.current = identity;
    synchronizedValueRef.current = serializedValue;
    setDraft(serializedValue);
    setError(undefined);
  }, [identity, serializedValue]);
  return (
    <CustomWidgetCodeEditor
      id={editorId}
      label={label}
      description={description}
      language="json"
      value={draft}
      height="160px"
      error={error}
      onChange={(next) => {
        setDraft(next);
        try {
          const parsed = JSON.parse(next) as unknown;
          synchronizedValueRef.current = JSON.stringify(parsed ?? null, null, 2);
          onChange(parsed);
          setError(undefined);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Invalid JSON");
        }
      }}
      messages={editorMessages}
    />
  );
}
