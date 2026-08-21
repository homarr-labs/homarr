import { notFound } from "next/navigation";
import { Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { env } from "@homarr/docker/env";
import { getI18n } from "@homarr/translation/server";

import { NodesTable } from "~/app/[locale]/manage/tools/kubernetes/nodes/nodes-table";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import type { KubernetesContextSearchParams } from "../kubernetes-context";
import { getSelectedKubernetesContextAsync } from "../kubernetes-context";

export default async function NodesPage({ searchParams }: { searchParams: Promise<KubernetesContextSearchParams> }) {
  const session = await auth();
  if (!(session?.user.permissions.includes("admin") && env.ENABLE_KUBERNETES)) {
    notFound();
  }

  const context = await getSelectedKubernetesContextAsync(searchParams);
  const tResource = await getI18n("kubernetes.cluster.resources");
  const nodes =
    context.status === "unavailable" ? [] : await api.kubernetes.nodes.getNodes({ contextId: context.contextId });
  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <Title order={1}>{tResource("nodes")}</Title>
        <NodesTable contextId={context.contextId} initialNodes={nodes} />
      </Stack>
    </>
  );
}
