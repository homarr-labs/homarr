import { notFound } from "next/navigation";
import { Container, Group, Stack, Title } from "@mantine/core";
import { z } from "zod";

import { auth } from "@homarr/auth/next";
import { getIntegrationName, integrationKinds } from "@homarr/definitions";
import { getScopedI18n } from "@homarr/translation/server";
import { IntegrationAvatar } from "@homarr/ui";
import type { validation } from "@homarr/validation";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { NewIntegrationForm } from "../_integration-new-form";

interface NewIntegrationByIdPageProps {
  params: {
    id: string;
  };
  searchParams: Partial<z.infer<typeof validation.integration.create>>;
}

export function generateStaticParams() {
  return integrationKinds.map((kind) => ({
    id: kind,
  }));
}

export default async function IntegrationNewByIdPage(props: NewIntegrationByIdPageProps) {
  const { id } = props.params;
  const session = await auth();

  if (!session?.user.permissions.includes("integration-create")) {
    notFound();
  }

  const result = z.enum(integrationKinds).safeParse(id);
  if (!result.success) {
    notFound();
  }

  const tCreate = await getScopedI18n("integration.page.create");
  const currentKind = result.data;

  const dynamicMappings = new Map<string, string>([[id, getIntegrationName(currentKind)]]);

  return (
    <>
      <DynamicBreadcrumb dynamicMappings={dynamicMappings} nonInteractable={["new"]} />
      <Container>
        <Stack>
          <Group align="center">
            <IntegrationAvatar kind={currentKind} size="md" />
            <Title>{tCreate("title", { name: getIntegrationName(currentKind) })}</Title>
          </Group>
          <NewIntegrationForm searchParams={{ kind: currentKind }} />
        </Stack>
      </Container>
    </>
  );
}
