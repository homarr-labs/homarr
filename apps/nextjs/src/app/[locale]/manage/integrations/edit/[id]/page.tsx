import { Fieldset, Group, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { getIntegrationName } from "@homarr/definitions";
import { getI18n } from "@homarr/translation/server";
import { IntegrationAvatar } from "@homarr/ui";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { catchTrpcNotFound } from "~/errors/trpc-catch-error";
import { IntegrationAccessSettings } from "../../_components/integration-access-settings";
import { EditIntegrationForm } from "./_integration-edit-form";

interface EditIntegrationPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditIntegrationPage(props: EditIntegrationPageProps) {
  const params = await props.params;
  const editT = await getI18n("integration.page.edit");
  const t = await getI18n();
  const integration = await api.integration.byId({ id: params.id }).catch(catchTrpcNotFound);
  const integrationPermissions = await api.integration.getIntegrationPermissions({ id: integration.id });

  return (
    <ManagePageLayout
      title={
        <Group align="center">
          <IntegrationAvatar kind={integration.kind} size="md" />
          <Title>{editT("title", { name: getIntegrationName(integration.kind) })}</Title>
        </Group>
      }
      container="default"
      breadcrumbPlacement="outside"
      breadcrumb={
        <DynamicBreadcrumb dynamicMappings={new Map([[params.id, integration.name]])} nonInteractable={["edit"]} />
      }
    >
      <EditIntegrationForm integration={integration} />

      <Title order={2}>{t("permission.title")}</Title>
      <Fieldset>
        <IntegrationAccessSettings integration={integration} initialPermissions={integrationPermissions} />
      </Fieldset>
    </ManagePageLayout>
  );
}
