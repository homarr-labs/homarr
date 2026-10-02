"use client";

import { useCallback } from "react";
import { Button, Group, Stack, TextInput } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useZodForm } from "@homarr/form";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { groupUpdateSchema } from "@homarr/validation/group";

interface RenameGroupFormProps {
  group: {
    id: string;
    name: string;
  };
  disabled?: boolean;
}

export const RenameGroupForm = ({ group, disabled }: RenameGroupFormProps) => {
  const tGroup = useI18n("group");
  const tCommon = useI18n("common");
  const { mutate, isPending } = clientApi.group.updateGroup.useMutation();
  const form = useZodForm(groupUpdateSchema.pick({ name: true }), {
    initialValues: {
      name: group.name,
    },
  });

  const handleSubmit = useCallback(
    (values: FormType) => {
      if (disabled) {
        return;
      }
      mutate(
        {
          ...values,
          id: group.id,
        },
        {
          onSuccess() {
            void revalidatePathActionAsync(`/users/groups/${group.id}`);
            showSuccessNotification({
              title: tCommon("notification.update.success"),
              message: tGroup("action.update.notification.success.message", {
                name: values.name,
              }),
            });
          },
          onError() {
            showErrorNotification({
              title: tCommon("notification.update.error"),
              message: tGroup("action.update.notification.error.message", {
                name: values.name,
              }),
            });
          },
        },
      );
    },
    [group.id, mutate, tGroup, tCommon, disabled],
  );

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <TextInput label={tCommon("field.name")} {...form.getInputProps("name")} disabled={disabled} />

        {!disabled && (
          <Group justify="end">
            <Button type="submit" loading={isPending}>
              {tCommon("action.saveChanges")}
            </Button>
          </Group>
        )}
      </Stack>
    </form>
  );
};

interface FormType {
  name: string;
}
