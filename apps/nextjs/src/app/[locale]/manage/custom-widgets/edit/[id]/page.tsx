import { redirect } from "next/navigation";
import { Container, Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { buildDisplayFormValues } from "@homarr/custom-widgets/core";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { catchTrpcNotFound } from "~/errors/trpc-catch-error";
import { CustomWidgetBetaBanner } from "../../_beta-banner";
import { CustomWidgetForm } from "../../_custom-widget-form";

const authTypeExpectedSecrets: Record<string, string[]> = {
  bearer: ["apiKey"],
  basic: ["username", "password"],
  apiKeyHeader: ["apiKey"],
  apiKeyQuery: ["apiKey"],
};

function buildInitialSecrets(authType: string, dbSecrets: Array<{ kind: string; hasValue?: boolean }>) {
  const expected = authTypeExpectedSecrets[authType] ?? [];
  const existingKinds = new Set(dbSecrets.map((s) => s.kind));
  const result = dbSecrets.map((s) => ({ kind: s.kind, value: "", hasValue: s.hasValue ?? false }));
  for (const kind of expected) {
    if (!existingKinds.has(kind)) {
      result.push({ kind, value: "", hasValue: false });
    }
  }
  return result;
}

interface EditCustomWidgetPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCustomWidgetPage(props: EditCustomWidgetPageProps) {
  const session = await auth();
  if (!session || !session.user.permissions.includes("admin")) {
    redirect("/manage/custom-widgets");
  }

  const params = await props.params;
  const definition = await api.customWidget.byId({ id: params.id }).catch(catchTrpcNotFound);

  const displayConfig = definition.displayConfig as Record<string, unknown>;
  const displayValues = buildDisplayFormValues(definition.displayType, displayConfig);

  return (
    <>
      <DynamicBreadcrumb dynamicMappings={new Map([[params.id, definition.name]])} nonInteractable={["edit"]} />
      <Container fluid>
        <Stack>
          <Title>{definition.name}</Title>
          <CustomWidgetBetaBanner />
          <CustomWidgetForm
            mode="edit"
            definitionId={params.id}
            initialValues={{
              name: definition.name,
              description: definition.description ?? "",
              iconUrl: definition.iconUrl ?? "",
              url: definition.url,
              authType: definition.authType,
              headerName: definition.headerName ?? "",
              method: definition.method,
              requestBody: definition.requestBody ?? "",
              ...displayValues,
              secrets: buildInitialSecrets(definition.authType, definition.secrets),
            }}
          />
        </Stack>
      </Container>
    </>
  );
}
