import { Container, Stack, Title } from "@homarr/ui";

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
