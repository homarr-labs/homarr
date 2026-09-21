import { redirect } from "next/navigation";
import { Container, Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { createLoginUrl } from "@homarr/auth/shared";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { catchTrpcNotFound } from "~/errors/trpc-catch-error";
import { CustomWidgetForm } from "../../_custom-widget-form";
import { FormErrorBoundary } from "../../_form-error-boundary";

interface EditCustomWidgetPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCustomWidgetPage(props: EditCustomWidgetPageProps) {
  const [session, params] = await Promise.all([auth(), props.params]);
  if (!session) {
    redirect(createLoginUrl(`/manage/custom-widgets/edit/${params.id}`));
  }
  if (!session.user.permissions.includes("admin")) {
    redirect("/manage/custom-widgets");
  }
  const definition = await api.customWidget.get({ id: params.id }).catch(catchTrpcNotFound);

  return (
    <>
      <DynamicBreadcrumb dynamicMappings={new Map([[params.id, definition.name]])} nonInteractable={["edit"]} />
      <Container fluid>
        <Stack>
          <Title>{definition.name}</Title>
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
