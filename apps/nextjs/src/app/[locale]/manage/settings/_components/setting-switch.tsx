import type { ReactNode } from "react";
import React from "react";
import type { MantineSpacing } from "@mantine/core";
import { Group, Stack, Switch, Text, UnstyledButton } from "@mantine/core";

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
  const handleClick = React.useCallback(() => {
    if (disabled) {
      return;
    }

    form.setFieldValue(formKey, (previous) => !previous as never);
  }, [form, formKey, disabled]);

  return (
    <Group ms={ms} justify="space-between" gap="lg" align="center" wrap="nowrap">
      <UnstyledButton style={{ flexGrow: 1 }} onClick={handleClick}>
        <Stack gap={0}>
          <Text fw="bold">{title}</Text>
          <Text c="gray.5" fz={{ base: "xs", md: "sm" }}>
            {text}
          </Text>
        </Stack>
      </UnstyledButton>
      <Switch disabled={disabled} onClick={handleClick} checked={Boolean(form.values[formKey])} />
    </Group>
  );
};
