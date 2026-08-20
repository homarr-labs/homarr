import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { extractBaseUrlFromHeaders } from "@homarr/common";
import { env } from "@homarr/docker/env";
import { getI18n } from "@homarr/translation/server";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { DockerReconciliation } from "./docker-reconciliation";
import { DockerTable } from "./docker-table";

export default async function DockerPage() {
  const session = await auth();
  if (!(session?.user.permissions.includes("admin") && env.ENABLE_DOCKER)) {
    notFound();
  }

  const [{ containers, endpoints, timestamp }, requestHeaders] = await Promise.all([
    api.docker.getContainers(),
    headers(),
  ]);
  const tDocker = await getI18n("docker");

  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <Title order={1}>{tDocker("title")}</Title>
        <DockerReconciliation defaultServerOrigin={extractBaseUrlFromHeaders(requestHeaders)} />
        <DockerTable initialData={{ containers, endpoints, timestamp }} />
      </Stack>
    </>
  );
}
