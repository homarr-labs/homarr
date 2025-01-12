import { notFound } from "next/navigation";
import { Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";

import { ConfigmapsTable } from "~/app/[locale]/manage/tools/kubernetes/configmaps/configmaps-table";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { env } from "~/env";

export default async function ConfigMapsPage() {
  const session = await auth();
  if (!(session?.user.permissions.includes("admin") && env.ENABLE_KUBERNETES)) {
    notFound();
  }

  const configMaps = await api.kubernetes.configMaps.getConfigMaps();
  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <Title order={1}>ConfigMaps</Title>
        <ConfigmapsTable initialConfigMaps={configMaps} />
      </Stack>
    </>
  );
}
