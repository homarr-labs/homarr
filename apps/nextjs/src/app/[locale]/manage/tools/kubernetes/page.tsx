import { notFound } from "next/navigation";

import { auth } from "@homarr/auth/next";

import { ClusterDashboard } from "~/app/[locale]/manage/tools/kubernetes/cluster-dashboard/cluster-dashboard";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";

export default async function KubernetesPage() {
  const session = await auth();
  if (!session?.user || !session.user.permissions.includes("admin")) {
    notFound();
  }

  return (
    <>
      <DynamicBreadcrumb />
      <ClusterDashboard />
    </>
  );
}
