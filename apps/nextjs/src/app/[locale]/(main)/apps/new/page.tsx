import { Container, Stack, Title } from "@homarr/ui";

import { NewAppForm } from "./_form";

export default function NewAppPage() {
  return (
    <Container>
      <Stack>
        <Title>New app</Title>
        <NewAppForm />
      </Stack>
    </Container>
  );
}
