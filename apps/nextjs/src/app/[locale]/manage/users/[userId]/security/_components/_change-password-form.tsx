"use client";

import { Button, Fieldset, Group, PasswordInput, Stack } from "@mantine/core";

import type { RouterInputs, RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useZodForm } from "@homarr/form";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { CustomPasswordInput } from "@homarr/ui";
import { userChangePasswordSchema } from "@homarr/validation/user";

interface ChangePasswordFormProps {
  user: RouterOutputs["user"]["getById"];
}

export const ChangePasswordForm = ({ user }: ChangePasswordFormProps) => {
  const { data: session } = useSession();
  const tUser = useI18n("user");
  const tCommon = useI18n("common");
  const { mutate, isPending } = clientApi.user.changePassword.useMutation({
    async onSettled() {
      await revalidatePathActionAsync(`/manage/users/${user.id}`);
    },
    onSuccess() {
      showSuccessNotification({
        message: tUser("action.changePassword.notification.success.message"),
      });
    },
    onError() {
      showErrorNotification({
        message: tUser("action.changePassword.notification.error.message"),
      });
    },
  });
  const form = useZodForm(userChangePasswordSchema, {
    initialValues: {
      /* Require previous password if the current user want's to change his password */
      previousPassword: session?.user.id === user.id ? "" : "_",
      password: "",
      confirmPassword: "",
    },
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
        <Fieldset legend={tUser("action.changePassword.label")}>
          <Stack gap="xs">
            {/* Require previous password if the current user want's to change his password */}
            {session?.user.id === user.id && (
              <PasswordInput
                withAsterisk
                label={tUser("field.previousPassword.label")}
                {...form.getInputProps("previousPassword")}
              />
            )}

            <CustomPasswordInput
              withPasswordRequirements
              withAsterisk
              label={tUser("field.password.label")}
              {...form.getInputProps("password")}
            />

            <PasswordInput
              withAsterisk
              label={tUser("field.passwordConfirm.label")}
              {...form.getInputProps("confirmPassword")}
            />

            <Group justify="end">
              <Button type="submit" loading={isPending}>
                {tCommon("action.confirm")}
              </Button>
            </Group>
          </Stack>
        </Fieldset>
      </Stack>
    </form>
  );
};

type FormType = Omit<RouterInputs["user"]["changePassword"], "userId">;
