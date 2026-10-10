import { Stack, Text, Title } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(public)/_public/about_/status")({ component: ApplicationStatus });

function ApplicationStatus() {
  return (
    <Stack>
      <Title order={1}>Application status</Title>
      <Text>The public shell is available. Protected services are unavailable.</Text>
    </Stack>
  );
}
