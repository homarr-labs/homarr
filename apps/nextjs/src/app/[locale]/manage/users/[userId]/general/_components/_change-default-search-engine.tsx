"use client";

import { Button, Group, Select, Stack } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useZodForm } from "@homarr/form";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import type { z } from "@homarr/validation";
import { validation } from "@homarr/validation";

interface ChangeDefaultSearchEngineFormProps {
  user: RouterOutputs["user"]["getById"];
  searchEnginesData: { value: string; label: string }[];
}

export const ChangeDefaultSearchEngineForm = ({ user, searchEnginesData }: ChangeDefaultSearchEngineFormProps) => {
  const t = useI18n();
  const { mutate, isPending } = clientApi.user.changeDefaultSearchEngine.useMutation({
    async onSettled() {
      await revalidatePathActionAsync(`/manage/users/${user.id}`);
    },
    onSuccess(_, variables) {
      form.setInitialValues({
        defaultSearchEngineId: variables.defaultSearchEngineId,
      });
      showSuccessNotification({
        message: t("user.action.changeDefaultSearchEngine.notification.success.message"),
      });
    },
    onError() {
      showErrorNotification({
        message: t("user.action.changeDefaultSearchEngine.notification.error.message"),
      });
    },
  });
  const form = useZodForm(validation.user.changeDefaultSearchEngine, {
    initialValues: {
      defaultSearchEngineId: user.defaultSearchEngineId ?? "",
    },
  });

  const handleSubmit = (values: FormType) => {
    mutate({
      userId: user.id,
      ...values,
    });
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <Select w="100%" data={searchEnginesData} {...form.getInputProps("defaultSearchEngineId")} />

        <Group justify="end">
          <Button type="submit" color="teal" loading={isPending}>
            {t("common.action.save")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

type FormType = z.infer<typeof validation.user.changeDefaultSearchEngine>;
