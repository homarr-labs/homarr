import { notFound } from "next/navigation";
import { Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { env } from "@homarr/docker/env";
import { getScopedI18n } from "@homarr/translation/server";

import { SecretsTable } from "~/app/[locale]/manage/tools/kubernetes/secrets/secrets-table";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import type { KubernetesContextSearchParams } from "../kubernetes-context";
import { getSelectedKubernetesContextAsync } from "../kubernetes-context";

export default async function SecretsPage({ searchParams }: { searchParams: Promise<KubernetesContextSearchParams> }) {
  const session = await auth();
  if (!(session?.user.permissions.includes("admin") && env.ENABLE_KUBERNETES)) {
    notFound();
  }

  const context = await getSelectedKubernetesContextAsync(searchParams);
  const secrets =
    context.status === "unavailable" ? [] : await api.kubernetes.secrets.getSecrets({ contextId: context.contextId });
  const tSecrets = await getScopedI18n("kubernetes.secrets");
  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <Title order={1}>{tSecrets("label")}</Title>
        <SecretsTable contextId={context.contextId} initialSecrets={secrets} />
      </Stack>
    </>
  );
}
