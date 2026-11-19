import { notFound } from "next/navigation";

import { api, getBackendRuntimeAsync } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getI18n } from "@homarr/translation/server";

import { ServicesTable } from "~/app/[locale]/manage/tools/kubernetes/services/services-table";
import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import type { KubernetesContextSearchParams } from "../kubernetes-context";
import { getSelectedKubernetesContextAsync } from "../kubernetes-context";

export default async function ServicesPage({ searchParams }: { searchParams: Promise<KubernetesContextSearchParams> }) {
  const session = await auth();
  if (!(session?.user.permissions.includes("admin") && (await getBackendRuntimeAsync()).kubernetesEnabled)) {
    notFound();
  }

  const context = await getSelectedKubernetesContextAsync(searchParams);
  if (!context) return <DynamicBreadcrumb />;
  const tResource = await getI18n("kubernetes.cluster.resources");
  const services =
    context.status === "unavailable" ? [] : await api.kubernetes.services.getServices.query({ contextId: context.contextId });
  return (
    <ManagePageLayout title={tResource("services")} container={false}>
      <ServicesTable contextId={context.contextId} initialServices={services} />
    </ManagePageLayout>
  );
}
