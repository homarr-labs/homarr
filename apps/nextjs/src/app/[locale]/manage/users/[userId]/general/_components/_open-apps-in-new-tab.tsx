"use client";

import { Button, Group, Stack, Switch } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useZodForm } from "@homarr/form";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import type { z } from "@homarr/validation";
import { validation } from "@homarr/validation";

interface OpenAppsInNewTabProps {
  user: RouterOutputs["user"]["getById"];
}

export const OpenAppsInNewTab = ({ user }: OpenAppsInNewTabProps) => {
  const t = useI18n();
  const { mutate, isPending } = clientApi.user.changeOpenAppsInNewTab.useMutation({
    async onSettled() {
      await revalidatePathActionAsync(`/manage/users/${user.id}`);
    },
    onSuccess(_, variables) {
      form.setInitialValues({
        openAppsInNewTab: variables.openAppsInNewTab,
      });
      showSuccessNotification({
        message: t("user.action.changeOpenAppsInNewTab.notification.success.message"),
      });
    },
    onError() {
      showErrorNotification({
        message: t("user.action.changeOpenAppsInNewTab.notification.error.message"),
      });
    },
  });
  const form = useZodForm(validation.user.openAppsInNewTab, {
    initialValues: {
      openAppsInNewTab: user.openAppsInNewTab,
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
        <Switch {...form.getInputProps("openAppsInNewTab")} label={t("user.field.openAppsInNewTab.label")} />

        <Group justify="end">
          <Button type="submit" color="teal" loading={isPending}>
            {t("common.action.save")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

type FormType = z.infer<typeof validation.user.openAppsInNewTab>;
