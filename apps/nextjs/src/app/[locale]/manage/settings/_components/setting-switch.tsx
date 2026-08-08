import type { ReactNode } from "react";
import React from "react";
import type { MantineSpacing } from "@mantine/core";
import { Group, Stack, Switch, Text, UnstyledButton } from "@mantine/core";

import type { UseFormReturnType } from "@homarr/form";

export const SwitchSetting = <TFormValue extends Record<string, unknown>>({
  form,
  ms,
  title,
  text,
  formKey,
  disabled,
}: {
  form: UseFormReturnType<TFormValue, TFormValue>;
  formKey: string & keyof TFormValue;
  ms?: MantineSpacing;
  title: string;
  text: ReactNode;
  disabled?: boolean;
}) => {
  const booleanForm = form as UseFormReturnType<Record<string, boolean>, Record<string, boolean>>;

  const handleClick = React.useCallback(() => {
    if (disabled) {
      return;
    }

    booleanForm.setFieldValue(formKey as string, (previous) => !previous);
  }, [booleanForm, formKey, disabled]);

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
      <Switch
        disabled={disabled}
        onClick={handleClick}
        checked={Boolean(booleanForm.values[formKey as string]) && !disabled}
      />
    </Group>
  );
};
