import { notFound } from "next/navigation";

import type { IntegrationKind } from "@homarr/db/schema/items";
import { integrationKinds } from "@homarr/db/schema/items";
import { Container, Group, Stack, Title } from "@homarr/ui";
import type { v } from "@homarr/validation";
import { z } from "@homarr/validation";

import { IntegrationAvatar } from "../_avatar";
import { NewIntegrationForm } from "./_form";

interface NewIntegrationPageProps {
  searchParams: Partial<z.infer<typeof v.integration.create>> & {
    kind: IntegrationKind;
  };
}

export default function IntegrationsNewPage({
  searchParams,
}: NewIntegrationPageProps) {
  const result = z
    .enum([integrationKinds[0]!, ...integrationKinds.slice(1)])
    .safeParse(searchParams.kind);
  if (!result.success) {
    notFound();
  }

  const currentKind = result.data;

  return (
    <Container>
      <Stack>
        <Group align="center">
          <IntegrationAvatar kind={currentKind} size="md" />
          <Title>New {currentKind} integration</Title>
        </Group>
        <NewIntegrationForm searchParams={searchParams} />
      </Stack>
    </Container>
  );
}
