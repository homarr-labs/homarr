import { notFound } from "next/navigation";
import { Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { env } from "@homarr/docker/env";
import { getScopedI18n } from "@homarr/translation/server";

import { VolumesTable } from "~/app/[locale]/manage/tools/kubernetes/volumes/volumes-table";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import type { KubernetesContextSearchParams } from "../kubernetes-context";
import { getSelectedKubernetesContextAsync } from "../kubernetes-context";

export default async function VolumesPage({ searchParams }: { searchParams: Promise<KubernetesContextSearchParams> }) {
  const session = await auth();
  if (!(session?.user.permissions.includes("admin") && env.ENABLE_KUBERNETES)) {
    notFound();
  }

  const context = await getSelectedKubernetesContextAsync(searchParams);
  const volumes =
    context.status === "unavailable" ? [] : await api.kubernetes.volumes.getVolumes({ contextId: context.contextId });
  const tVolumes = await getScopedI18n("kubernetes.volumes");
  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <Title order={1}>{tVolumes("label")}</Title>
        <VolumesTable contextId={context.contextId} initialVolumes={volumes} />
      </Stack>
    </>
  );
}
