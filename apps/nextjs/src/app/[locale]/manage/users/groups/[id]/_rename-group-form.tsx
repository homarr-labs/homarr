"use client";

import { useCallback } from "react";

import { clientApi } from "@homarr/api/client";
import { useForm } from "@homarr/form";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { Button, Group, Stack, TextInput } from "@homarr/ui";

import { revalidatePathAction } from "~/app/revalidatePathAction";

interface RenameGroupFormProps {
  group: {
    id: string;
    name: string;
  };
}

export const RenameGroupForm = ({ group }: RenameGroupFormProps) => {
  const t = useI18n();
  const { mutate, isPending } = clientApi.group.update.useMutation();
  const form = useForm<FormType>({
    initialValues: {
      name: group.name,
    },
  });

  const handleSubmit = useCallback(
    (values: FormType) => {
      mutate(
        {
          ...values,
          id: group.id,
        },
        {
          onSuccess() {
            void revalidatePathAction(`/users/groups/${group.id}`);
            showSuccessNotification({
              title: t("common.notification.update.success"),
              message: t("group.action.update.notification.success.message", {
                name: values.name,
              }),
            });
          },
          onError() {
            showErrorNotification({
              title: t("common.notification.update.error"),
              message: t("group.action.update.notification.error.message", {
                name: values.name,
              }),
            });
          },
        },
      );
    },
    [group.id, mutate, t],
  );

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <TextInput
          label={t("group.field.name")}
          {...form.getInputProps("name")}
        />

        <Group justify="end">
          <Button type="submit" color="teal" loading={isPending}>
            {t("common.action.saveChanges")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

interface FormType {
  name: string;
}
