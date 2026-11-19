import { notFound } from "next/navigation";

import { api, getBackendRuntimeAsync } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getI18n } from "@homarr/translation/server";

import { ConfigmapsTable } from "~/app/[locale]/manage/tools/kubernetes/configmaps/configmaps-table";
import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import type { KubernetesContextSearchParams } from "../kubernetes-context";
import { getSelectedKubernetesContextAsync } from "../kubernetes-context";

export default async function ConfigMapsPage({
  searchParams,
}: {
  searchParams: Promise<KubernetesContextSearchParams>;
}) {
  const session = await auth();
  if (!(session?.user.permissions.includes("admin") && (await getBackendRuntimeAsync()).kubernetesEnabled)) {
    notFound();
  }

  const context = await getSelectedKubernetesContextAsync(searchParams);
  if (!context) return <DynamicBreadcrumb />;
  const tResource = await getI18n("kubernetes.cluster.resources");
  const configMaps =
    context.status === "unavailable"
      ? []
      : await api.kubernetes.configMaps.getConfigMaps.query({ contextId: context.contextId });
  return (
    <ManagePageLayout title={tResource("configmaps")} container={false}>
      <ConfigmapsTable contextId={context.contextId} initialConfigMaps={configMaps} />
    </ManagePageLayout>
  );
}
