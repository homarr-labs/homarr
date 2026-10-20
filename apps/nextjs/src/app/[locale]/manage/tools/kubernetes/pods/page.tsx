import { notFound } from "next/navigation";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { env } from "@homarr/docker/env";
import { getI18n } from "@homarr/translation/server";

import { PodsTable } from "~/app/[locale]/manage/tools/kubernetes/pods/pods-table";
import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import type { KubernetesContextSearchParams } from "../kubernetes-context";
import { getSelectedKubernetesContextAsync } from "../kubernetes-context";

export default async function PodsPage({ searchParams }: { searchParams: Promise<KubernetesContextSearchParams> }) {
  const session = await auth();
  if (!(session?.user.permissions.includes("admin") && env.ENABLE_KUBERNETES)) {
    notFound();
  }

  const context = await getSelectedKubernetesContextAsync(searchParams);
  const tResource = await getI18n("kubernetes.cluster.resources");
  const pods =
    context.status === "unavailable" ? [] : await api.kubernetes.pods.getPods({ contextId: context.contextId });
  return (
    <ManagePageLayout title={tResource("pods")} container={false}>
      <PodsTable contextId={context.contextId} initialPods={pods} />
    </ManagePageLayout>
  );
}
