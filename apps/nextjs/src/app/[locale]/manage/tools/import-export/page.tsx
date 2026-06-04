import { notFound } from "next/navigation";
import { Stack, Title } from "@mantine/core";

import { auth } from "@homarr/auth/next";
import { env } from "@homarr/docker/env";
import { getScopedI18n } from "@homarr/translation/server";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { DockerDiscoveryPanel } from "./docker-discovery-panel";
import { ExportConfigCard } from "./export-config-card";
import { ImportConfigCard } from "./import-config-card";
import { ImportHomepageCard } from "./import-homepage-card";

export default async function ImportExportPage() {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) {
    notFound();
  }

  const t = await getScopedI18n("management.page.importExport" as never) as unknown as (key: string) => string;

  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <Title order={1}>{t("title")}</Title>
        <ExportConfigCard />
        <ImportConfigCard />
        <ImportHomepageCard />
        {env.ENABLE_DOCKER && <DockerDiscoveryPanel />}
      </Stack>
    </>
  );
}
