"use client";

import { PasswordInput, Stack } from "@mantine/core";
import type { PasswordInputProps } from "@mantine/core";

import { useScopedI18n } from "@homarr/translation/client";
import { CustomPasswordInput } from "@homarr/ui";

interface UserCreatePasswordFieldsProps {
  passwordInputProps: PasswordInputProps;
  confirmPasswordInputProps: PasswordInputProps;
  variant?: PasswordInputProps["variant"];
}

export const UserCreatePasswordFields = ({
  passwordInputProps,
  confirmPasswordInputProps,
  variant,
}: UserCreatePasswordFieldsProps) => {
  const t = useScopedI18n("user.field");

  return (
    <Stack gap="md">
      <CustomPasswordInput
        withPasswordRequirements
        label={t("password.label")}
        variant={variant}
        {...passwordInputProps}
      />
      <PasswordInput label={t("passwordConfirm.label")} variant={variant} {...confirmPasswordInputProps} />
    </Stack>
  );
};
