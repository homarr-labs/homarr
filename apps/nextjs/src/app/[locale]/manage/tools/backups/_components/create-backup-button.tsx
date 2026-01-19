"use client";

import { Button } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

import { useModalAction } from "@homarr/modals";
import { useScopedI18n } from "@homarr/translation/client";

import { CreateBackupModal } from "./create-backup-modal";

export const CreateBackupButton = () => {
  const tBackup = useScopedI18n("backup");
  const { openModal } = useModalAction(CreateBackupModal);

  return (
    <Button leftSection={<IconPlus size={16} />} onClick={() => openModal({})}>
      {tBackup("action.create.label")}
    </Button>
  );
};
