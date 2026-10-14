import type { ReactNode } from "react";
import { Checkbox, Fieldset, Stack, TextInput } from "@mantine/core";
import type { CheckboxProps, TextInputProps } from "@mantine/core";

export interface IntegrationFormFieldsProps {
  mode: "create" | "edit";
  name: TextInputProps;
  url?: TextInputProps;
  secretsTitle: string;
  secrets: ReactNode;
  searchEngine?: CheckboxProps;
  app: ReactNode;
  error?: ReactNode;
  actions?: ReactNode;
  holds?: ReactNode;
  validation?: ReactNode;
}

export function IntegrationFormFields({
  mode,
  name,
  url,
  secretsTitle,
  secrets,
  searchEngine,
  app,
  error,
  actions,
  holds,
  validation,
}: IntegrationFormFieldsProps) {
  return (
    <Stack>
      {validation}
      <TextInput withAsterisk {...name} />
      {url && <TextInput withAsterisk label="URL" {...url} />}
      <Fieldset legend={secretsTitle}>
        <Stack gap="sm">{secrets}</Stack>
      </Fieldset>
      {mode === "create" && error}
      {searchEngine && <Checkbox {...searchEngine} />}
      {app}
      {mode === "edit" && error}
      {holds}
      {actions}
    </Stack>
  );
}
