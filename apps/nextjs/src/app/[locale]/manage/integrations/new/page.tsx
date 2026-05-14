import { notFound } from "next/navigation";
import { Button, Center, Container, Group, Stack, Text, Title } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { z } from "zod/v4";

import { auth } from "@homarr/auth/next";
import { getIntegrationName, integrationKinds } from "@homarr/definitions";
import { getScopedI18n } from "@homarr/translation/server";
import { IntegrationAvatar, Link } from "@homarr/ui";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { IntegrationNewFormWrapper } from "./_integration-new-form-wrapper";

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
          <Center py="xl">
            <Stack align="center" gap="md">
              <Title order={3}>{t("action.create")}</Title>
              <Text c="dimmed">{t("page.list.search")}</Text>
              <Button
                variant="default"
                component={Link}
                href="/manage/integrations"
                leftSection={<IconArrowLeft size={16} />}
              >
                {t("page.list.title")}
              </Button>
            </Stack>
          </Center>
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
