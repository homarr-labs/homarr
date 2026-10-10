import { Stack, Title } from "@mantine/core";
import { createFileRoute, Outlet } from "@tanstack/react-router";

import { RouteError, RouteNotFound, RoutePending } from "../../-components/recovery";

export const Route = createFileRoute("/(public)/_public/about")({
  component: AboutLayout,
  pendingComponent: RoutePending,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
});

function AboutLayout() {
  return (
    <Stack data-about-layout>
      <Title order={1}>About Homarr</Title>
      <Outlet />
    </Stack>
  );
}
