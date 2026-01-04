import { notFound } from "next/navigation";
import { Group, Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getScopedI18n } from "@homarr/translation/server";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { createMetaTitle } from "~/metadata";
import { BackupsTable } from "./_components/backups-table";
import { CreateBackupButton } from "./_components/create-backup-button";
import { RestoreBackupButton } from "./_components/restore-backup-button";

export async function generateMetadata() {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) {
    return {};
  }
  const t = await getScopedI18n("management");

  return {
    title: createMetaTitle(t("metaTitle")),
  };
}

export default async function BackupsPage() {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) {
    notFound();
  }

  const backups = await api.backup.list();
  const tBackup = await getScopedI18n("backup");

  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <Group justify="space-between" align="center">
          <Title order={1}>{tBackup("title")}</Title>
          <Group>
            <RestoreBackupButton />
            <CreateBackupButton />
          </Group>
        </Group>
        <BackupsTable initialBackups={backups} />
      </Stack>
    </>
  );
}
