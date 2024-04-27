import { notFound } from "next/navigation";
import { Container, Group, Stack, Title } from "@mantine/core";

import type { IntegrationKind } from "@homarr/definitions";
import { getIntegrationName, integrationKinds } from "@homarr/definitions";
import { getScopedI18n } from "@homarr/translation/server";
import type { validation } from "@homarr/validation";
import { z } from "@homarr/validation";

import { IntegrationAvatar } from "../_integration-avatar";
import { NewIntegrationForm } from "./_integration-new-form";

interface NewIntegrationPageProps {
  searchParams: Partial<z.infer<typeof validation.integration.create>> & {
    kind: IntegrationKind;
  };
}

export default async function IntegrationsNewPage({
  searchParams,
}: NewIntegrationPageProps) {
  const result = z
    .enum([integrationKinds[0]!, ...integrationKinds.slice(1)])
    .safeParse(searchParams.kind);
  if (!result.success) {
    notFound();
  }

  const t = await getScopedI18n("integration.page.create");

  const currentKind = result.data;

  return (
    <Container>
      <Stack>
        <Group align="center">
          <IntegrationAvatar kind={currentKind} size="md" />
          <Title>{t("title", { name: getIntegrationName(currentKind) })}</Title>
        </Group>
        <NewIntegrationForm searchParams={searchParams} />
      </Stack>
    </Container>
  );
}
