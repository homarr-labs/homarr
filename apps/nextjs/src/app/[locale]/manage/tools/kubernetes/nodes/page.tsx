import { notFound } from "next/navigation";
import { Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { env } from "@homarr/docker/env";

import { NodesTable } from "~/app/[locale]/manage/tools/kubernetes/nodes/nodes-table";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";

export default async function NodesPage() {
  const session = await auth();
  if (!(session?.user.permissions.includes("admin") && env.ENABLE_KUBERNETES)) {
    notFound();
  }

  const nodes = await api.kubernetes.nodes.getNodes();

  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <Title order={1}>Nodes</Title>
        <NodesTable initialNodes={nodes} />
      </Stack>
    </>
  );
}
