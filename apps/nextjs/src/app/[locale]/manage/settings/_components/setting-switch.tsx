import type { ReactNode } from "react";
import React from "react";
import type { MantineSpacing } from "@mantine/core";
import { Group, Stack, Switch, Text, UnstyledButton } from "@mantine/core";

import type { UseFormReturnType } from "@homarr/form";
import type { defaultServerSettings } from "@homarr/server-settings";

export const SwitchSetting = ({
  form,
  ms,
  title,
  text,
  formKey,
  disabled,
}: {
  form: UseFormReturnType<typeof defaultServerSettings.analytics & typeof defaultServerSettings.crawlingAndIndexing>;
  formKey: keyof typeof defaultServerSettings.analytics | keyof typeof defaultServerSettings.crawlingAndIndexing;
  ms?: MantineSpacing;
  title: string;
  text: ReactNode;
  disabled?: boolean;
}) => {
  const handleClick = React.useCallback(() => {
    if (disabled) {
      return;
    }

    const invertedValue = !form.values[formKey];
    form.setFieldValue(formKey, () => invertedValue);
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
      <Switch disabled={disabled} onClick={handleClick} checked={form.values[formKey] && !disabled} />
    </Group>
  );
};
