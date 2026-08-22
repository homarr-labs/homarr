"use client";

import { useRouter } from "next/navigation";
import { Button, PasswordInput, Stack, TextInput } from "@mantine/core";
import type { z } from "zod/v4";

import { clientApi } from "@homarr/api/client";
import { useZodForm } from "@homarr/form";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { CustomPasswordInput } from "@homarr/ui";
import { userRegistrationSchema } from "@homarr/validation/user";

interface RegistrationFormProps {
  invite: {
    id: string;
    token: string;
  };
}

export const RegistrationForm = ({ invite }: RegistrationFormProps) => {
  const t = useI18n("user");
  const router = useRouter();
  const { mutate, isPending } = clientApi.user.register.useMutation();
  const form = useZodForm(userRegistrationSchema, {
    initialValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = (values: z.infer<typeof userRegistrationSchema>) => {
    mutate(
      {
        ...values,
        inviteId: invite.id,
        token: invite.token,
      },
      {
        onSuccess() {
          showSuccessNotification({
            title: t("action.register.notification.success.title"),
            message: t("action.register.notification.success.message"),
          });
          router.push("/auth/login");
        },
        onError(error) {
          const message =
            error.data?.code === "CONFLICT"
              ? t("error.usernameTaken")
              : t("action.register.notification.error.message");

          showErrorNotification({
            title: t("action.register.notification.error.title"),
            message,
          });
        },
      },
    );
  };

  return (
    <Stack gap="xl">
      <form autoComplete="on" onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="lg">
          <TextInput
            label={t("field.username.label")}
            id="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            {...form.getInputProps("username")}
            name="username"
          />
          <CustomPasswordInput
            withPasswordRequirements
            label={t("field.password.label")}
            id="password"
            autoComplete="new-password"
            {...form.getInputProps("password")}
            name="password"
          />

          <PasswordInput
            label={t("field.passwordConfirm.label")}
            id="password-confirm"
            autoComplete="new-password"
            {...form.getInputProps("confirmPassword")}
            name="password-confirmation"
          />
          <Button type="submit" fullWidth loading={isPending}>
            {t("action.register.label")}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
};
