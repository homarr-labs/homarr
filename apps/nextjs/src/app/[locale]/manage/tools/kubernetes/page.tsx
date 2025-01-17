import { notFound } from "next/navigation";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";

import { KubernetesTable } from "~/app/[locale]/manage/tools/kubernetes/node-components/nodes-table";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";

export default async function KubernetesPage() {
  const session = await auth();
  if (!session?.user || !session.user.permissions.includes("admin")) {
    notFound();
  }

  const kubernetesNodes = await api.kubernetes.getNodes();

  return (
    <>
      <DynamicBreadcrumb />
      <KubernetesTable {...kubernetesNodes} />
    </>
  );
}
