import { Button, Group, Stack, TextInput } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useForm } from "@homarr/form";
import { createModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

export const CreateBackupModal = createModal(({ actions }) => {
  const t = useI18n();
  const tBackup = useScopedI18n("backup");

  const utils = clientApi.useUtils();
  const { mutate, isPending } = clientApi.backup.createFull.useMutation();

  const form = useForm({
    initialValues: {
      name: "",
    },
  });

  const handleSubmit = (values: { name: string }) => {
    mutate(
      { name: values.name || undefined },
      {
        onSuccess: (data) => {
          void utils.backup.list.invalidate();
          showSuccessNotification({
            title: tBackup("action.create.success.title"),
            message: tBackup("action.create.success.message", { fileName: data.fileName }),
          });
          actions.closeModal();
        },
        onError: () => {
          showErrorNotification({
            title: tBackup("action.create.error.title"),
            message: tBackup("action.create.error.message"),
          });
        },
      },
    );
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        form.onSubmit(handleSubmit)(event);
      }}
    >
      <Stack>
        <TextInput
          label={tBackup("field.name")}
          placeholder={tBackup("action.create.namePlaceholder")}
          data-autofocus
          {...form.getInputProps("name")}
        />
        <Group justify="end">
          <Button onClick={actions.closeModal} variant="subtle" color="gray">
            {t("common.action.cancel")}
          </Button>
          <Button type="submit" loading={isPending}>
            {tBackup("action.create.confirm")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}).withOptions({
  defaultTitle: (t) => t("backup.action.create.label"),
});
