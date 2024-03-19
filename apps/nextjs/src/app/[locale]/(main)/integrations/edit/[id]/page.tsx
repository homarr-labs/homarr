import { api } from "@homarr/api/server";
import { getIntegrationName } from "@homarr/definitions";
import { getScopedI18n } from "@homarr/translation/server";
import { Container, Group, Stack, Title } from "@homarr/ui";

import { IntegrationAvatar } from "../../_integration-avatar";
import { EditIntegrationForm } from "./_integration-edit-form";

interface EditIntegrationPageProps {
  params: { id: string };
}

export default async function EditIntegrationPage({
  params,
}: EditIntegrationPageProps) {
  const t = await getScopedI18n("integration.page.edit");
  const integration = await api.integration.byId({ id: params.id });

  return (
    <Container>
      <Stack>
        <Group align="center">
          <IntegrationAvatar kind={integration.kind} size="md" />
          <Title>
            {t("title", { name: getIntegrationName(integration.kind) })}
          </Title>
        </Group>
        <EditIntegrationForm integration={integration} />
      </Stack>
    </Container>
  );
}
