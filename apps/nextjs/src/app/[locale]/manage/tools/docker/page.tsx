import { Box } from "@mantine/core";

import { api } from "@homarr/api/server";

import { DockerTable } from "./DockerTable";

export default async function DockerPage() {
  const { containers, timestamp } = await api.docker.getContainers();
  return (
    <Box style={{ borderRadius: 6 }} p="md" bg="black">
      <h2>Welcome to docker !</h2>
      <DockerTable containers={containers} timestamp={timestamp} />
    </Box>
  );
}
