import { notFound } from "next/navigation";
import { Stack, Title } from "@mantine/core";

import { api, getBackendRuntimeAsync } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getI18n } from "@homarr/translation/server";

import { VolumesTable } from "~/app/[locale]/manage/tools/kubernetes/volumes/volumes-table";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import type { KubernetesContextSearchParams } from "../kubernetes-context";
import { getSelectedKubernetesContextAsync } from "../kubernetes-context";

export default async function VolumesPage({ searchParams }: { searchParams: Promise<KubernetesContextSearchParams> }) {
  const session = await auth();
  if (!(session?.user.permissions.includes("admin") && (await getBackendRuntimeAsync()).kubernetesEnabled)) {
    notFound();
  }

  const context = await getSelectedKubernetesContextAsync(searchParams);
  const tResource = await getI18n("kubernetes.cluster.resources");
  const volumes =
    context.status === "unavailable" ? [] : await api.kubernetes.volumes.getVolumes.query({ contextId: context.contextId });
  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <Title order={1}>{tResource("volumes")}</Title>
        <VolumesTable contextId={context.contextId} initialVolumes={volumes} />
      </Stack>
    </>
  );
}
