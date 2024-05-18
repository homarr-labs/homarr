"use client";

import { Button, Fieldset, Group, PasswordInput, Stack } from "@mantine/core";

import type { RouterInputs, RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useForm, zodResolver } from "@homarr/form";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { validation } from "@homarr/validation";

import { revalidatePathActionAsync } from "~/app/revalidatePathAction";

interface ChangePasswordFormProps {
  user: RouterOutputs["user"]["getById"];
}

export const ChangePasswordForm = ({ user }: ChangePasswordFormProps) => {
  const { data: session } = useSession();
  const t = useI18n();
  const { mutate, isPending } = clientApi.user.changePassword.useMutation({
    async onSettled() {
      await revalidatePathActionAsync(`/manage/users/${user.id}`);
    },
    onSuccess() {
      showSuccessNotification({
        message: t("user.action.changePassword.notification.success.message"),
      });
    },
    onError() {
      showErrorNotification({
        message: t("user.action.changePassword.notification.error.message"),
      });
    },
  });
  const form = useForm<FormType>({
    initialValues: {
      previousPassword: "",
      password: "",
      confirmPassword: "",
    },
    validate: zodResolver(validation.user.changePassword),
    validateInputOnBlur: true,
    validateInputOnChange: true,
  });

  const handleSubmit = (values: FormType) => {
    mutate(
      {
        userId: user.id,
        ...values,
      },
      {
        onSettled() {
          form.reset();
        },
      },
    );
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <Fieldset legend={t("user.action.changePassword.label")}>
          <Stack gap="xs">
            {/* Require previous password if the current user want's to change his password */}
            {session?.user.id === user.id && (
              <PasswordInput
                withAsterisk
                label={t("user.field.previousPassword.label")}
                {...form.getInputProps("previousPassword")}
              />
            )}

            <PasswordInput
              withAsterisk
              label={t("user.field.password.label")}
              {...form.getInputProps("password")}
            />

            <PasswordInput
              withAsterisk
              label={t("user.field.passwordConfirm.label")}
              {...form.getInputProps("confirmPassword")}
            />

            <Group justify="end">
              <Button type="submit" color="teal" loading={isPending}>
                {t("common.action.confirm")}
              </Button>
            </Group>
          </Stack>
        </Fieldset>
      </Stack>
    </form>
  );
};

type FormType = Omit<RouterInputs["user"]["changePassword"], "userId">;
