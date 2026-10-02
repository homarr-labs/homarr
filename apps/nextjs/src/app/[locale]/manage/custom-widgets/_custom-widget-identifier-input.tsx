"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { TextInput } from "@mantine/core";

export function CustomWidgetIdentifierInput({
  label,
  value,
  error,
  disabled,
  style,
  onCommit,
}: {
  label: string;
  value: string;
  error?: ReactNode;
  disabled?: boolean;
  style?: CSSProperties;
  onCommit(value: string): void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (draft !== value) onCommit(draft);
  };
  return (
    <TextInput
      label={label}
      value={draft}
      error={error}
      disabled={disabled}
      style={style}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          setDraft(value);
        }
      }}
    />
  );
}
