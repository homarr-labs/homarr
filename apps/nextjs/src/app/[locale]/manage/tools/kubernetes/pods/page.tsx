import { notFound } from "next/navigation";
import { Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { env } from "@homarr/docker/env";

import { PodsTable } from "~/app/[locale]/manage/tools/kubernetes/pods/pods-table";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";

export default async function PodsPage() {
  const session = await auth();
  if (!(session?.user.permissions.includes("admin") && env.ENABLE_KUBERNETES)) {
    notFound();
  }

  const pods = await api.kubernetes.pods.getPods();

  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <Title order={1}>Pods</Title>
        <PodsTable initialPods={pods} />
      </Stack>
    </>
  );
}
