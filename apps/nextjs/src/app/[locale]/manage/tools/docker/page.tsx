import { Box } from "@mantine/core";

import { api } from "@homarr/api/server";

export default async function DockerPage() {
  const { containers, timestamp } = await api.docker.getContainers();
  const timeAgo = new Intl.RelativeTimeFormat("en", {
    style: "narrow",
  }).format((new Date().getTime() - new Date(timestamp).getTime()) / 1000, "seconds");
  return (
    <Box style={{ borderRadius: 6 }} p="md" bg="black">
      <h2>Welcome to docker !</h2>
      <p>Last time this was fetched was: {timeAgo} ago</p>
      <ul>
        {containers.map((container) => (
          <li key={container.id}>{container.name}</li>
        ))}
      </ul>
    </Box>
  );
}
