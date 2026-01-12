"use client";

import { Button } from "@mantine/core";
import { IconDatabaseImport } from "@tabler/icons-react";

import { useModalAction } from "@homarr/modals";
import { useScopedI18n } from "@homarr/translation/client";

import { RestoreBackupModal } from "./restore-backup-modal";

export const RestoreBackupButton = () => {
  const tBackup = useScopedI18n("backup");
  const { openModal } = useModalAction(RestoreBackupModal);

  return (
    <Button variant="default" leftSection={<IconDatabaseImport size={16} stroke={1.5} />} onClick={() => openModal()}>
      {tBackup("action.restore.label")}
    </Button>
  );
};
