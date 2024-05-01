import { Container, Stack, Title } from "@mantine/core";

import { AppNewForm } from "./_app-new-form";

export default function AppNewPage() {
  return (
    <Container>
      <Stack>
        <Title>New app</Title>
        <AppNewForm />
      </Stack>
    </Container>
  );
}
