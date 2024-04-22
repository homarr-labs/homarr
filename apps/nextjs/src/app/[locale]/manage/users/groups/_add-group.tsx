"use client";

import { clientApi } from "@homarr/api/client";
import { useForm } from "@homarr/form";
import { createModal, useModalAction } from "@homarr/modals";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { Button, Group, Stack, TextInput } from "@homarr/ui";

import { revalidatePathAction } from "~/app/revalidatePathAction";

export const AddGroup = () => {
  const t = useI18n();
  const { openModal } = useModalAction(AddGroupModal);

  const handleAddGroup = () => {
    openModal();
  };

  return (
    <Button onClick={handleAddGroup} color="teal">
      {t("group.action.create.label")}
    </Button>
  );
};

const AddGroupModal = createModal<void>(({ actions }) => {
  const t = useI18n();
  const { mutate, isPending } = clientApi.group.create.useMutation();
  const form = useForm({
    initialValues: {
      name: "",
    },
  });

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        mutate(values, {
          onSuccess() {
            actions.closeModal();
            void revalidatePathAction("/manage/users/groups");
            showSuccessNotification({
              title: t("common.notification.create.success"),
              message: t("group.action.create.notification.success.message"),
            });
          },
          onError() {
            showErrorNotification({
              title: t("common.notification.create.error"),
              message: t("group.action.create.notification.error.message"),
            });
          },
        });
      })}
    >
      <Stack>
        <TextInput
          label={t("group.field.name")}
          data-autofocus
          {...form.getInputProps("name")}
        />
        <Group justify="right">
          <Button onClick={actions.closeModal} variant="subtle" color="gray">
            {t("common.action.cancel")}
          </Button>
          <Button loading={isPending} type="submit" color="teal">
            {t("common.action.create")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}).withOptions({
  defaultTitle: (t) => t("group.action.create.label"),
});
