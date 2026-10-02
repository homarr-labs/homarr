"use client";

import { Button, Group, Stack, TextInput } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useZodForm } from "@homarr/form";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { groupCreateSchema } from "@homarr/validation/group";

interface GroupCreateFormProps {
  onCancel: () => void;
  onCreated: () => void;
}

export const GroupCreateForm = ({ onCancel, onCreated }: GroupCreateFormProps) => {
  const tGroup = useI18n("group");
  const tCommon = useI18n("common");
  const form = useZodForm(groupCreateSchema, {
    initialValues: {
      name: "",
    },
  });
  const { mutateAsync, isPending } = clientApi.group.createGroup.useMutation();

  const handleSubmit = form.onSubmit(async (values) => {
    await mutateAsync(values, {
      async onSuccess() {
        await revalidatePathActionAsync("/manage/users/groups");
        showSuccessNotification({
          title: tCommon("notification.create.success"),
          message: tGroup("action.create.notification.success.message"),
        });
        onCreated();
      },
      onError() {
        showErrorNotification({
          title: tCommon("notification.create.error"),
          message: tGroup("action.create.notification.error.message"),
        });
      },
    });
  });

  return (
    <form onSubmit={handleSubmit}>
      <Stack>
        <TextInput label={tCommon("field.name")} autoFocus {...form.getInputProps("name")} />
        <Group justify="end">
          <Button variant="default" onClick={onCancel}>
            {tCommon("action.cancel")}
          </Button>
          <Button loading={isPending} type="submit">
            {tCommon("action.create")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
