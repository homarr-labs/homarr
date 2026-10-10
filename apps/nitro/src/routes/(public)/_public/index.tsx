import { Stack, Text, Title } from "@mantine/core";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/(public)/_public/")({ component: Welcome });

function Welcome() {
  return (
    <Stack>
      <Title order={1}>Homarr</Title>
      <Text>The Nitro application foundation is running. Product features are not installed yet.</Text>
      <Link to="/about/runtime/$section" params={{ section: "foundation" }} search={{ view: "summary" }}>
        Runtime foundation
      </Link>
    </Stack>
  );
}
