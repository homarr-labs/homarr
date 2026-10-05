import { notFound } from "next/navigation";
import { Box, Group } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { env } from "@homarr/docker/env";

import "@xterm/xterm/css/xterm.css";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { fullHeightWithoutHeaderAndFooter } from "~/constants";
import { ClientSideDockerLogsTerminal } from "./client";

interface DockerContainerLogsPageProps {
  params: Promise<{ containerId: string }>;
  searchParams: Promise<{ endpointId?: string; name?: string }>;
}

export default async function DockerContainerLogsPage({ params, searchParams }: DockerContainerLogsPageProps) {
  const session = await auth();
  if (!(session?.user.permissions.includes("admin") && env.ENABLE_DOCKER)) {
    notFound();
  }

  const { containerId } = await params;
  const { endpointId, name } = await searchParams;
  const resolvedEndpointId = endpointId ?? (await getOnlyDockerEndpointIdAsync());
  if (!resolvedEndpointId) notFound();

  try {
    await api.docker.logs({ endpointId: resolvedEndpointId, id: containerId, tail: 1 });
  } catch {
    notFound();
  }

  return (
    <>
      <Group justify="space-between" align="center" wrap="nowrap">
        <DynamicBreadcrumb
          dynamicMappings={new Map([[containerId, name ?? containerId]])}
          nonInteractable={[containerId]}
        />
      </Group>
      <Box style={{ borderRadius: 6 }} h={fullHeightWithoutHeaderAndFooter} p="md" bg="black">
        <ClientSideDockerLogsTerminal endpointId={resolvedEndpointId} containerId={containerId} />
      </Box>
    </>
  );
}

const getOnlyDockerEndpointIdAsync = async () => {
  try {
    const endpoints = await api.docker.getEndpoints();
    return endpoints.length === 1 ? endpoints[0]?.id : undefined;
  } catch {
    return undefined;
  }
};
