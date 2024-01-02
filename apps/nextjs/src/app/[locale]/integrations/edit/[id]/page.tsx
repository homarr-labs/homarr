import { getScopedI18n } from "@homarr/translation/server";
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
  const t = await getScopedI18n("integration.page.edit");
  const integration = await api.integration.byId.query({ id: params.id });

  return (
    <Container>
      <Stack>
        <Group align="center">
          <IntegrationAvatar kind={integration.kind} size="md" />
          <Title>{t("title", { name: integration.kind })}</Title>
        </Group>
        <EditIntegrationForm integration={integration} />
      </Stack>
    </Container>
  );
}
