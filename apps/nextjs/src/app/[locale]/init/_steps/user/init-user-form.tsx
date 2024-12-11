"use client";

import { Button, PasswordInput, Stack, TextInput } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useZodForm } from "@homarr/form";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import { CustomPasswordInput } from "@homarr/ui";
import type { z } from "@homarr/validation";
import { validation } from "@homarr/validation";

export const InitUserForm = () => {
  const t = useScopedI18n("user");
  const tUser = useScopedI18n("init.step.user");
  const { mutateAsync, isPending } = clientApi.user.initUser.useMutation();
  const form = useZodForm(validation.user.init, {
    initialValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleSubmitAsync = async (values: FormType) => {
    await mutateAsync(values, {
      async onSuccess() {
        showSuccessNotification({
          title: tUser("notification.success.title"),
          message: tUser("notification.success.message"),
        });
        await revalidatePathActionAsync("/init");
      },
      onError: (error) => {
        showErrorNotification({
          title: tUser("notification.error.title"),
          message: error.message,
        });
      },
    });
  };

  return (
    <Stack gap="xl">
      <form
        onSubmit={form.onSubmit(
          (values) => void handleSubmitAsync(values),
          (err) => console.log(err),
        )}
      >
        <Stack gap="lg">
          <TextInput label={t("field.username.label")} {...form.getInputProps("username")} />
          <CustomPasswordInput
            withPasswordRequirements
            label={t("field.password.label")}
            {...form.getInputProps("password")}
          />
          <PasswordInput label={t("field.passwordConfirm.label")} {...form.getInputProps("confirmPassword")} />
          <Button type="submit" fullWidth loading={isPending}>
            {t("action.create")}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
};

type FormType = z.infer<typeof validation.user.init>;
