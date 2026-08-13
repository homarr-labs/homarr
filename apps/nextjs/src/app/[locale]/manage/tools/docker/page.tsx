import { notFound } from "next/navigation";
import { Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { env } from "@homarr/docker/env";
import { getScopedI18n } from "@homarr/translation/server";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { DockerReconciliation } from "./docker-reconciliation";
import { DockerTable } from "./docker-table";

export default async function DockerPage() {
  const session = await auth();
  if (!(session?.user.permissions.includes("admin") && env.ENABLE_DOCKER)) {
    notFound();
  }

  const { containers, endpoints, timestamp } = await api.docker.getContainers();
  const tDocker = await getScopedI18n("docker");

  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <Title order={1}>{tDocker("title")}</Title>
        <DockerReconciliation />
        <DockerTable initialData={{ containers, endpoints, timestamp }} />
      </Stack>
    </>
  );
}
