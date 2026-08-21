import { notFound } from "next/navigation";
import { Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { env } from "@homarr/docker/env";
import { getI18n } from "@homarr/translation/server";

import { NamespacesTable } from "~/app/[locale]/manage/tools/kubernetes/namespaces/namespaces-table";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import type { KubernetesContextSearchParams } from "../kubernetes-context";
import { getSelectedKubernetesContextAsync } from "../kubernetes-context";

export default async function NamespacesPage({
  searchParams,
}: {
  searchParams: Promise<KubernetesContextSearchParams>;
}) {
  const session = await auth();
  if (!(session?.user.permissions.includes("admin") && env.ENABLE_KUBERNETES)) {
    notFound();
  }

  const context = await getSelectedKubernetesContextAsync(searchParams);
  const tResource = await getI18n("kubernetes.cluster.resources");
  const namespaces =
    context.status === "unavailable"
      ? []
      : await api.kubernetes.namespaces.getNamespaces({ contextId: context.contextId });
  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <Title order={1}>{tResource("namespaces")}</Title>
        <NamespacesTable contextId={context.contextId} initialNamespaces={namespaces} />
      </Stack>
    </>
  );
}
