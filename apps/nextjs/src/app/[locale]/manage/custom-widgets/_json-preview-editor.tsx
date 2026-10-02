"use client";

import { useEffect, useState } from "react";

import { useI18n } from "@homarr/translation/client";

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
  const t = useI18n("customWidget.workbench.builder");
  const serialized = JSON.stringify(value, null, 2);
  const [draft, setDraft] = useState(serialized);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    if (!invalid) setDraft(serialized);
  }, [invalid, serialized]);
  return (
    <CodeEditor
      id={id}
      label={label}
      language="json"
      value={draft}
      error={invalid ? t("invalidJson") : undefined}
      onChange={(next) => {
        setDraft(next);
        const parsed = parseJson(next);
        const valid = isRecord(parsed);
        setInvalid(!valid);
        onChange(valid ? parsed : {});
      }}
    />
  );
}
