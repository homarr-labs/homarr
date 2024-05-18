"use client";

import { useCallback } from "react";
import { Button, Group, Stack, TextInput } from "@mantine/core";

import type { RouterInputs, RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useForm, zodResolver } from "@homarr/form";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { validation } from "@homarr/validation";

import { revalidatePathAction } from "~/app/revalidatePathAction";

interface UserProfileFormProps {
  user: RouterOutputs["user"]["getById"];
}

export const UserProfileForm = ({ user }: UserProfileFormProps) => {
  const t = useI18n();
  const form = useForm({
    initialValues: {
      name: user.name ?? "",
      email: user.email ?? "",
    },
    validate: zodResolver(validation.user.editProfile.omit({ id: true })),
    validateInputOnBlur: true,
    validateInputOnChange: true,
  });
  const { mutate, isPending } = clientApi.user.editProfile.useMutation({
    async onSettled() {
      await revalidatePathAction("/manage/users");
    },
    onSuccess(_, variables) {
      // Reset form initial values to reset dirty state
      form.setInitialValues({
        name: variables.name,
        email: variables.email ?? "",
      });
      showSuccessNotification({
        title: t("common.notification.update.success"),
        message: t("user.action.editProfile.notification.success.message"),
      });
    },
    onError(error) {
      const message =
        error.data?.code === "CONFLICT"
          ? t("user.error.usernameTaken")
          : t("user.action.editProfile.notification.error.message");
      showErrorNotification({
        title: t("common.notification.update.error"),
        message,
      });
    },
  });

  const handleSubmit = useCallback(
    (values: FormType) => {
      mutate({
        ...values,
        id: user.id,
      });
    },
    [user.id, mutate],
  );

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <TextInput
          label={t("user.field.username.label")}
          withAsterisk
          {...form.getInputProps("name")}
        />
        <TextInput
          label={t("user.field.email.label")}
          {...form.getInputProps("email")}
        />

        <Group justify="end">
          <Button
            type="submit"
            color="teal"
            disabled={!form.isDirty()}
            loading={isPending}
          >
            {t("common.action.saveChanges")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

type FormType = Omit<RouterInputs["user"]["editProfile"], "id">;
