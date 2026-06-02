import { notFound } from "next/navigation";
import { Box, Group, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { env } from "@homarr/docker/env";
import { getScopedI18n } from "@homarr/translation/server";

import "@xterm/xterm/css/xterm.css";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { fullHeightWithoutHeaderAndFooter } from "~/constants";
import { ClientSideDockerLogsTerminal } from "./client";

interface DockerContainerLogsPageProps {
  params: Promise<{ containerId: string }>;
  searchParams: Promise<{ name?: string }>;
}

export default async function DockerContainerLogsPage({ params, searchParams }: DockerContainerLogsPageProps) {
  const session = await auth();
  if (!(session?.user.permissions.includes("admin") && env.ENABLE_DOCKER)) {
    notFound();
  }

  const { containerId } = await params;
  const { name } = await searchParams;

  try {
    await api.docker.logs({ id: containerId, tail: 1 });
  } catch {
    notFound();
  }

  const tDocker = await getScopedI18n("docker");

  return (
    <>
      <Group justify="space-between" align="center" wrap="nowrap">
        <DynamicBreadcrumb />
      </Group>
      <Title order={2} mb="md">
        {tDocker("action.logs.page.title", { name: name ?? containerId })}
      </Title>
      <Box style={{ borderRadius: 6 }} h={fullHeightWithoutHeaderAndFooter} p="md" bg="black">
        <ClientSideDockerLogsTerminal containerId={containerId} />
      </Box>
    </>
  );
}
