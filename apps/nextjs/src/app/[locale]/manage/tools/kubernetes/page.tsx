import { notFound } from "next/navigation";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { env } from "@homarr/docker/env";

import { ClusterDashboard } from "~/app/[locale]/manage/tools/kubernetes/cluster-dashboard/cluster-dashboard";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import type { KubernetesContextSearchParams } from "./kubernetes-context";
import { getSelectedKubernetesContextAsync } from "./kubernetes-context";

const logger = createLogger({ module: "kubernetesDashboard" });

export default async function KubernetesPage({
  searchParams,
}: {
  searchParams: Promise<KubernetesContextSearchParams>;
}) {
  const session = await auth();
  if (!(session?.user.permissions.includes("admin") && env.ENABLE_KUBERNETES)) {
    notFound();
  }

  const context = await getSelectedKubernetesContextAsync(searchParams);
  const [cluster, resourceCounts] = await Promise.allSettled([
    api.kubernetes.cluster.getCluster({ contextId: context.contextId }),
    api.kubernetes.cluster.getClusterResourceCounts({ contextId: context.contextId }),
  ]);
  if (cluster.status === "rejected") {
    logger.error(new Error("Failed to load the Kubernetes cluster overview", { cause: cluster.reason }));
  }
  if (resourceCounts.status === "rejected") {
    logger.error(new Error("Failed to load Kubernetes resource counts", { cause: resourceCounts.reason }));
  }

  return (
    <>
      <DynamicBreadcrumb />
      <ClusterDashboard
        contextId={context.contextId}
        initialCluster={cluster.status === "fulfilled" ? cluster.value : null}
        initialResourceCounts={resourceCounts.status === "fulfilled" ? resourceCounts.value : null}
      />
    </>
  );
}
