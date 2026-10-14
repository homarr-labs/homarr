import { Container, Group, Stack, Text } from "@mantine/core";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

import { RouteError, RouteNotFound, RoutePending } from "../-components/recovery";

export const Route = createFileRoute("/(public)/_public")({
  component: PublicLayout,
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
});

function PublicLayout() {
  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Group component="nav" aria-label="Public navigation" justify="space-between">
          <Text fw={700}>Homarr</Text>
          <Group>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
            <Link to="/preview/header">Header draft</Link>
            <Link to="/preview/backup">Backup display</Link>
            <Link to="/manage">Management</Link>
          </Group>
        </Group>
        <main>
          <Outlet />
        </main>
      </Stack>
    </Container>
  );
}
