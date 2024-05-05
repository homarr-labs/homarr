"use client";

import { Button, Fieldset, Group, PasswordInput, Stack } from "@mantine/core";

import type { RouterInputs, RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useForm, zodResolver } from "@homarr/form";
import { showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { validation } from "@homarr/validation";

import { revalidatePathAction } from "~/app/revalidatePathAction";

interface ChangePasswordFormProps {
  user: RouterOutputs["user"]["getById"];
}

export const ChangePasswordForm = ({ user }: ChangePasswordFormProps) => {
  const { data: session } = useSession();
  const t = useI18n();
  const { mutate, isPending } = clientApi.user.changePassword.useMutation({
    onSettled: async () => {
      await revalidatePathAction(`/manage/users/${user.id}`);
      showSuccessNotification({
        title: t(
          "management.page.user.edit.section.security.changePassword.message.passwordUpdated",
        ),
        message: "",
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
        <Fieldset
          legend={t(
            "management.page.user.edit.section.security.changePassword.title",
          )}
        >
          <Stack gap="xs">
            {/* Require previous password if the current user want's to change his password */}
            {session?.user.id === user.id && (
              <PasswordInput
                label="Previous password"
                {...form.getInputProps("previousPassword")}
              />
            )}

            <PasswordInput
              label={t("user.field.password.label")}
              {...form.getInputProps("password")}
            />

            <PasswordInput
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
