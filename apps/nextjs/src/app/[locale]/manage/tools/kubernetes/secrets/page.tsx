import { notFound } from "next/navigation";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { env } from "@homarr/docker/env";
import { getI18n } from "@homarr/translation/server";

import { SecretsTable } from "~/app/[locale]/manage/tools/kubernetes/secrets/secrets-table";
import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import type { KubernetesContextSearchParams } from "../kubernetes-context";
import { getSelectedKubernetesContextAsync } from "../kubernetes-context";

export default async function SecretsPage({ searchParams }: { searchParams: Promise<KubernetesContextSearchParams> }) {
  const session = await auth();
  if (!(session?.user.permissions.includes("admin") && env.ENABLE_KUBERNETES)) {
    notFound();
  }

  const context = await getSelectedKubernetesContextAsync(searchParams);
  const tResource = await getI18n("kubernetes.cluster.resources");
  const secrets =
    context.status === "unavailable" ? [] : await api.kubernetes.secrets.getSecrets({ contextId: context.contextId });
  return (
    <ManagePageLayout title={tResource("secrets")} container={false}>
      <SecretsTable contextId={context.contextId} initialSecrets={secrets} />
    </ManagePageLayout>
  );
}
