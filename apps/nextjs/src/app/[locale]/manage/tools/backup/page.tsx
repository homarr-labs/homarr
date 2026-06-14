import { notFound } from "next/navigation";
import { Stack, Title } from "@mantine/core";

import { auth } from "@homarr/auth/next";
import { dbEnv } from "@homarr/core/infrastructure/db/env";
import { getScopedI18n } from "@homarr/translation/server";

import { createMetaTitle } from "~/metadata";
import { BackupExportCard } from "./_components/backup-export-card";
import { BackupImportCard } from "./_components/backup-import-card";

export async function generateMetadata() {
  const session = await auth();
  if (!session?.user.permissions.includes("admin") || dbEnv.DRIVER !== "better-sqlite3") {
    return {};
  }

  const t = await getScopedI18n("management.page.tool.backup");

  return {
    title: createMetaTitle(t("metaTitle")),
  };
}

export default async function BackupPage() {
  const session = await auth();
  if (!session?.user.permissions.includes("admin") || dbEnv.DRIVER !== "better-sqlite3") {
    notFound();
  }

  const t = await getScopedI18n("management.page.tool.backup");

  return (
    <Stack>
      <Title>{t("title")}</Title>
      <BackupExportCard />
      <BackupImportCard />
    </Stack>
  );
}
