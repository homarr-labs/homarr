import { Container, Group, Stack, Title } from "@homarr/ui";

import { api } from "~/trpc/server";
import { IntegrationAvatar } from "../../_avatar";
import { EditIntegrationForm } from "./_form";

interface EditIntegrationPageProps {
  params: { id: string };
}

export default async function EditIntegrationPage({
  params,
}: EditIntegrationPageProps) {
  const integration = await api.integration.byId.query({ id: params.id });

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
          <IntegrationAvatar sort={integration.sort} size="md" />
          <Title>Edit {integration.sort} integration</Title>
        </Group>
        <EditIntegrationForm
          serviceData={serviceData}
          integration={integration}
        />
      </Stack>
    </Container>
  );
}
