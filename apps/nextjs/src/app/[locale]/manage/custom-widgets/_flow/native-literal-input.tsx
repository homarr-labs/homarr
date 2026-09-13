"use client";

import { useEffect, useState } from "react";
import { Checkbox, MultiSelect, NumberInput, Select, TagsInput, Textarea, TextInput } from "@mantine/core";
import { useI18n } from "@homarr/translation/client";
import { isRecord } from "../_custom-widget-form-utils";
import type { NativeInputSchema } from "./native-editor-model";

export interface NativeLiteralInputProps {
  label: string;
  schema: NativeInputSchema;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  required?: boolean;
}

/** Scalar and list inputs stay visual; only complex nested values need JSON. */
export function NativeLiteralInput({ schema, value, onChange, ...props }: NativeLiteralInputProps) {
  const common = { ...props, description: typeof schema.description === "string" ? schema.description : undefined };
  if (schema.type === "boolean") {
    return (
      <Checkbox {...common} checked={value === true} onChange={(event) => onChange(event.currentTarget.checked)} />
    );
  }
  if (Array.isArray(schema.enum) && schema.enum.every((entry) => typeof entry === "string")) {
    return (
      <Select
        {...common}
        data={schema.enum as string[]}
        value={typeof value === "string" ? value : null}
        onChange={(next) => {
          if (next !== null) onChange(next);
        }}
      />
    );
  }
  if (schema.type === "number" || schema.type === "integer") {
    return (
      <NumberInput
        {...common}
        value={typeof value === "number" || typeof value === "string" ? value : ""}
        min={typeof schema.minimum === "number" ? schema.minimum : undefined}
        max={typeof schema.maximum === "number" ? schema.maximum : undefined}
        allowDecimal={schema.type !== "integer"}
        clampBehavior="blur"
        onChange={onChange}
      />
    );
  }
  if (schema.type === "string") {
    return (
      <TextInput
        {...common}
        value={typeof value === "string" ? value : ""}
        maxLength={typeof schema.maxLength === "number" ? schema.maxLength : undefined}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    );
  }
  const items = isRecord(schema.items) ? schema.items : {};
  if (schema.type === "array" && items.type === "string") {
    const values = Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
    if (Array.isArray(items.enum) && items.enum.every((entry) => typeof entry === "string")) {
      return <MultiSelect {...common} data={items.enum as string[]} value={values} onChange={onChange} />;
    }
    return <TagsInput {...common} value={values} onChange={onChange} />;
  }
  return <NativeJsonInput {...props} value={value} onChange={onChange} />;
}

function NativeJsonInput({ label, value, onChange, disabled, required }: Omit<NativeLiteralInputProps, "schema">) {
  const t = useI18n("customWidget.flow");
  const serialized = JSON.stringify(value ?? null, null, 2);
  const [text, setText] = useState(serialized);
  const [error, setError] = useState(false);
  useEffect(() => {
    setText(serialized);
    setError(false);
  }, [serialized]);
  return (
    <Textarea
      data-workbench-local-input={error || undefined}
      label={label}
      description={t("nativeNestedJson")}
      value={text}
      disabled={disabled}
      required={required}
      autosize
      minRows={3}
      error={error && t("nativeInvalidJson")}
      onChange={(event) => {
        const next = event.currentTarget.value;
        setText(next);
        try {
          const parsed: unknown = JSON.parse(next);
          onChange(parsed);
          setError(false);
        } catch {
          setError(true);
        }
      }}
    />
  );
}
