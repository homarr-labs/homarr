import { Alert, Stack } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";

import { BackupPage } from "../../../../features/backup/backup-page";

export const Route = createFileRoute("/(public)/_public/preview/backup")({ component: BackupDisplayPreview });

function BackupDisplayPreview() {
  return (
    <Stack>
      <Alert color="orange" title="Backup operations unavailable">
        Original backup controls are shown for display feedback only. No inspector, exporter or restore operation is
        bound. File selection reports unavailable inspection without reading or uploading its bytes. Do not select a
        real backup for this preview. No migration, restore or sign-in success is simulated.
      </Alert>
      <BackupPage />
    </Stack>
  );
}
