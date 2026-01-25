"use client";

import { Button, Group, Stack, Switch } from "@mantine/core";
import type { z } from "zod/v4";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useZodForm } from "@homarr/form";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { userDdgBangsSchema } from "@homarr/validation/user";

interface DdgBangsFormProps {
  user: RouterOutputs["user"]["getById"];
}

export const DdgBangsForm = ({ user }: DdgBangsFormProps) => {
  const t = useI18n();
  const { mutate, isPending } = clientApi.user.changeDdgBangs.useMutation({
    async onSettled() {
      await revalidatePathActionAsync(`/manage/users/${user.id}`);
    },
    onSuccess(_, variables) {
      form.setInitialValues({
        ddgBangs: variables.ddgBangs,
      });
      showSuccessNotification({
        message: t("user.action.changeDdgBangs.notification.success.message"),
      });
    },
    onError() {
      showErrorNotification({
        message: t("user.action.changeDdgBangs.notification.error.message"),
      });
    },
  });

  const form = useZodForm(userDdgBangsSchema, {
    initialValues: {
      ddgBangs: user.ddgBangs,
    },
  });

  const handleSubmit = (values: FormType) => {
    mutate({
      id: user.id,
      ...values,
    });
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <Switch {...form.getInputProps("ddgBangs", { type: "checkbox" })} label={t("user.field.ddgBangs.label")} />

        <Group justify="end">
          <Button type="submit" loading={isPending}>
            {t("common.action.save")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

type FormType = z.infer<typeof userDdgBangsSchema>;
