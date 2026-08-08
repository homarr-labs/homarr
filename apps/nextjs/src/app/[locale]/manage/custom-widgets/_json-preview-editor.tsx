"use client";

import { useEffect, useState } from "react";

import { CodeEditor } from "./_code-editor";
import { isRecord, parseJson } from "./_custom-widget-form-utils";

export function JsonPreviewEditor({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: Record<string, unknown>;
  onChange(value: Record<string, unknown>): void;
}) {
  const serialized = JSON.stringify(value, null, 2);
  const [draft, setDraft] = useState(serialized);
  useEffect(() => setDraft(serialized), [serialized]);
  return (
    <CodeEditor
      id={id}
      label={label}
      language="json"
      value={draft}
      onChange={(next) => {
        setDraft(next);
        const parsed = parseJson(next);
        if (isRecord(parsed)) onChange(parsed);
      }}
    />
  );
}
