"use client";

import { useCallback, useState } from "react";
import { Button, Modal, Stack, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

export const CreateBackupButton = () => {
  const tBackup = useScopedI18n("backup");
  const [opened, { open, close }] = useDisclosure(false);
  const [name, setName] = useState("");

  const utils = clientApi.useUtils();

  const createMutation = clientApi.backup.createFull.useMutation({
    onSuccess: async (data) => {
      await utils.backup.list.invalidate();
      showSuccessNotification({
        title: tBackup("action.create.success.title"),
        message: tBackup("action.create.success.message", { fileName: data.fileName }),
      });
      handleClose();
    },
    onError: () => {
      showErrorNotification({
        title: tBackup("action.create.error.title"),
        message: tBackup("action.create.error.message"),
      });
    },
  });

  const handleClose = useCallback(() => {
    close();
    setName("");
  }, [close]);

  const handleCreate = useCallback(() => {
    createMutation.mutate({ name: name || undefined });
  }, [createMutation, name]);

  return (
    <>
      <Button leftSection={<IconPlus size={16} />} onClick={open}>
        {tBackup("action.create.label")}
      </Button>

      <Modal opened={opened} onClose={handleClose} title={tBackup("action.create.label")}>
        <Stack>
          <TextInput
            label={tBackup("field.name")}
            placeholder={tBackup("action.create.namePlaceholder")}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Button onClick={handleCreate} loading={createMutation.isPending} fullWidth>
            {tBackup("action.create.confirm")}
          </Button>
        </Stack>
      </Modal>
    </>
  );
};
