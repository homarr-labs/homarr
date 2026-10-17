import type { ReactNode } from "react";
import React from "react";
import type { MantineSpacing } from "@mantine/core";
import { Switch, Text } from "@mantine/core";

import type { UseFormReturnType } from "@homarr/form";

type BooleanKeys<TFormValue> = {
  [TKey in keyof TFormValue]: TFormValue[TKey] extends boolean ? TKey : never;
}[keyof TFormValue];

export const SwitchSetting = <TFormValue extends Record<string, unknown>>({
  form,
  ms,
  title,
  text,
  formKey,
  disabled,
}: {
  form: UseFormReturnType<TFormValue, TFormValue>;
  formKey: string & BooleanKeys<TFormValue>;
  ms?: MantineSpacing;
  title: string;
  text: ReactNode;
  disabled?: boolean;
}) => {
  const switchId = React.useId();
  const titleId = `${switchId}-title`;
  const handleChange = React.useCallback(() => {
    if (disabled) {
      return;
    }

    form.setFieldValue(formKey, (previous) => !previous as never);
  }, [form, formKey, disabled]);

  return (
    <Switch
      id={switchId}
      ms={ms}
      labelPosition="left"
      aria-labelledby={titleId}
      label={
        <Text component="span" id={titleId} fw="bold">
          {title}
        </Text>
      }
      description={
        <Text component="span" c="gray.5" fz={{ base: "xs", md: "sm" }}>
          {text}
        </Text>
      }
      styles={{
        body: { alignItems: "center" },
        labelWrapper: { flexGrow: 1, paddingInlineEnd: "var(--mantine-spacing-lg)" },
        label: { padding: 0 },
        description: { marginTop: 0, padding: 0 },
      }}
      disabled={disabled}
      onChange={handleChange}
      checked={Boolean(form.values[formKey])}
    />
  );
};
