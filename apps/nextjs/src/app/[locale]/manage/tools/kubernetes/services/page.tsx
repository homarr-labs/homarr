import { notFound } from "next/navigation";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { env } from "@homarr/docker/env";
import { getI18n } from "@homarr/translation/server";

import { ServicesTable } from "~/app/[locale]/manage/tools/kubernetes/services/services-table";
import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import type { KubernetesContextSearchParams } from "../kubernetes-context";
import { getSelectedKubernetesContextAsync } from "../kubernetes-context";

export default async function ServicesPage({ searchParams }: { searchParams: Promise<KubernetesContextSearchParams> }) {
  const session = await auth();
  if (!(session?.user.permissions.includes("admin") && env.ENABLE_KUBERNETES)) {
    notFound();
  }

  const context = await getSelectedKubernetesContextAsync(searchParams);
  const tResource = await getI18n("kubernetes.cluster.resources");
  const services =
    context.status === "unavailable" ? [] : await api.kubernetes.services.getServices({ contextId: context.contextId });
  return (
    <ManagePageLayout title={tResource("services")} container={false}>
      <ServicesTable contextId={context.contextId} initialServices={services} />
    </ManagePageLayout>
  );
}
