"use client";

import { useRouter } from "next/navigation";
import { Button, PasswordInput, Stack, TextInput } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useForm, zodResolver } from "@homarr/form";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import type { z } from "@homarr/validation";
import { validation } from "@homarr/validation";

interface RegistrationFormProps {
  invite: {
    id: string;
    token: string;
  };
}

export const RegistrationForm = ({ invite }: RegistrationFormProps) => {
  const t = useScopedI18n("user");
  const router = useRouter();
  const { mutate, isPending } = clientApi.user.register.useMutation();
  const form = useForm<FormType>({
    validate: zodResolver(validation.user.registration),
    initialValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
    validateInputOnBlur: true,
    validateInputOnChange: true,
  });

  const handleSubmit = (values: FormType) => {
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
        onError() {
          showErrorNotification({
            title: t("action.register.notification.error.title"),
            message: t("action.register.notification.error.message"),
          });
        },
      },
    );
  };

  return (
    <Stack gap="xl">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="lg">
          <TextInput
            label={t("field.username.label")}
            autoComplete="off"
            {...form.getInputProps("username")}
          />
          <PasswordInput
            label={t("field.password.label")}
            autoComplete="new-password"
            {...form.getInputProps("password")}
          />

          <PasswordInput
            label={t("field.passwordConfirm.label")}
            autoComplete="new-password"
            {...form.getInputProps("confirmPassword")}
          />
          <Button type="submit" fullWidth loading={isPending}>
            {t("action.register.label")}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
};

type FormType = z.infer<typeof validation.user.registration>;
