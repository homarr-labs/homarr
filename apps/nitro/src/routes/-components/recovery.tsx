import { Button, Stack, Text, Title } from "@mantine/core";
import { Link, useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";

import { AccessDeniedError } from "../../app/router";

export function RoutePending() {
  return <Text component="output">Loading…</Text>;
}

export function RouteNotFound() {
  return (
    <Stack>
      <Title order={1}>Page not found</Title>
      <Link to="/">Return home</Link>
    </Stack>
  );
}

export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  if (error instanceof AccessDeniedError || error.message === "Access denied") {
    return (
      <Stack>
        <Title order={1}>Access denied</Title>
        <Text>This area requires an available identity and permission policy.</Text>
        <Link to="/">Return home</Link>
      </Stack>
    );
  }
  return (
    <Stack>
      <Title order={1}>Unable to load this page</Title>
      <Button
        onClick={async () => {
          await router.invalidate();
          reset();
        }}
      >
        Try again
      </Button>
      <Link to="/">Return home</Link>
    </Stack>
  );
}
