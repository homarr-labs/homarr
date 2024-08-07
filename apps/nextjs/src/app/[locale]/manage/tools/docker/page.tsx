import { notFound } from "next/navigation";
import { Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getScopedI18n } from "@homarr/translation/server";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { DockerTable } from "./docker-table";

export default async function DockerPage() {
  const session = await auth();
  if (!session?.user || !session.user.permissions.includes("admin")) {
    notFound();
  }

  const { containers, timestamp } = await api.docker.getContainers();
  const tDocker = await getScopedI18n("docker");

  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <Title order={1}>{tDocker("title")}</Title>
        <DockerTable containers={containers} timestamp={timestamp} />
      </Stack>
    </>
  );
}
