import { notFound } from "next/navigation";
import { Container, Group, Stack, Title } from "@mantine/core";
import { z } from "zod/v4";

import { auth } from "@homarr/auth/next";
import { getIntegrationName, integrationKinds } from "@homarr/definitions";
import { getScopedI18n } from "@homarr/translation/server";
import { IntegrationAvatar } from "@homarr/ui";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { env } from "~/env";
import { IntegrationNewFormWrapper } from "./_integration-new-form-wrapper";
import { IntegrationNewSelectGrid } from "./_integration-new-select-grid";

interface NewIntegrationPageProps {
  searchParams: Promise<{
    kind?: string;
    url?: string;
    name?: string;
  }>;
}

export default async function IntegrationsNewPage(props: NewIntegrationPageProps) {
  const searchParams = await props.searchParams;
  const session = await auth();
  if (!session?.user.permissions.includes("integration-create")) {
    notFound();
  }

  const result = z.enum(integrationKinds).safeParse(searchParams.kind);

  if (!result.success) {
    const t = await getScopedI18n("integration");
    return (
      <>
        <DynamicBreadcrumb />
        <Container>
          <Stack>
            <Title>{t("action.create")}</Title>
            <IntegrationNewSelectGrid enableMockIntegration={env.UNSAFE_ENABLE_MOCK_INTEGRATION} />
          </Stack>
        </Container>
      </>
    );
  }

  const tCreate = await getScopedI18n("integration.page.create");

  const currentKind = result.data;

  return (
    <>
      <DynamicBreadcrumb />
      <Container>
        <Stack>
          <Group align="center">
            <IntegrationAvatar kind={currentKind} size="md" />
            <Title>{tCreate("title", { name: getIntegrationName(currentKind) })}</Title>
          </Group>
          <IntegrationNewFormWrapper kind={currentKind} initialUrl={searchParams.url} initialName={searchParams.name} />
        </Stack>
      </Container>
    </>
  );
}
