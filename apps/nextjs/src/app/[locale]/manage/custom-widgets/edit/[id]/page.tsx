import { redirect } from "next/navigation";
import { Button, Container, Group, Stack, Title } from "@mantine/core";
import { getI18n } from "@homarr/translation/server";
import { Link } from "@homarr/ui";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { catchTrpcNotFound } from "~/errors/trpc-catch-error";
import { CustomWidgetBetaBanner } from "../../_beta-banner";
import { CustomWidgetForm } from "../../_custom-widget-form";
import { CustomWidgetRepair } from "../../_custom-widget-repair";
import { FormErrorBoundary } from "../../_form-error-boundary";

interface EditCustomWidgetPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCustomWidgetPage(props: EditCustomWidgetPageProps) {
  const session = await auth();
  if (!session || !session.user.permissions.includes("admin")) {
    redirect("/manage/custom-widgets");
  }
  const params = await props.params;
  const raw = await api.customWidget.getRaw({ id: params.id }).catch(catchTrpcNotFound);
  if (raw.issues.length > 0)
    return (
      <Container fluid>
        <CustomWidgetRepair definition={raw} />
      </Container>
    );
  const definition = await api.customWidget.get({ id: params.id }).catch(catchTrpcNotFound);
  const t = await getI18n("customWidget.package.conversion");

  return (
    <>
      <DynamicBreadcrumb dynamicMappings={new Map([[params.id, definition.name]])} nonInteractable={["edit"]} />
      <Container fluid>
        <Stack>
          <Group justify="space-between">
            <Title>{definition.name}</Title>
            <Button component={Link} href={`/manage/custom-widgets/packages/convert/${params.id}`} variant="light">
              {t("title")}
            </Button>
          </Group>
          <CustomWidgetBetaBanner />
          <FormErrorBoundary>
            <CustomWidgetForm
              mode="edit"
              definitionId={params.id}
              initialValues={{
                name: definition.name,
                description: definition.description ?? "",
                iconUrl: definition.iconUrl ?? "",
                sources: JSON.stringify(definition.sources, null, 2),
                requests: JSON.stringify(definition.requests, null, 2),
                options: JSON.stringify(definition.options, null, 2),
                template: definition.template,
                secrets: definition.secrets.map((secret) => ({
                  sourceId: secret.sourceId,
                  kind: secret.kind,
                  value: "",
                  hasValue: true,
                })),
              }}
            />
          </FormErrorBoundary>
        </Stack>
      </Container>
    </>
  );
}
