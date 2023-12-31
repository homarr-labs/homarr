import { notFound } from "next/navigation";

import type { IntegrationSort } from "@homarr/db/schema/items";
import { integrationSorts } from "@homarr/db/schema/items";
import { Container, Group, Stack, Title } from "@homarr/ui";
import type { v } from "@homarr/validation";
import { z } from "@homarr/validation";

import { api } from "~/trpc/server";
import { IntegrationAvatar } from "../_avatar";
import { NewIntegrationForm } from "./_form";

interface NewIntegrationPageProps {
  searchParams: Partial<z.infer<typeof v.integration.create>> & {
    sort: IntegrationSort;
  };
}

export default async function IntegrationsNewPage({
  searchParams,
}: NewIntegrationPageProps) {
  const result = z
    .enum([integrationSorts[0]!, ...integrationSorts.slice(1)])
    .safeParse(searchParams.sort);
  if (!result.success) {
    notFound();
  }

  const currentSort = result.data;
  const services = await api.service.all.query();
  const serviceData = services.map((service) => ({
    value: service.id,
    label: service.name,
    url: service.url,
  }));

  return (
    <Container>
      <Stack>
        <Group align="center">
          <IntegrationAvatar sort={currentSort} size="md" />
          <Title>New {currentSort} integration</Title>
        </Group>
        <NewIntegrationForm
          serviceData={serviceData}
          searchParams={searchParams}
        />
      </Stack>
    </Container>
  );
}
