import { Container, Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";

import type { DisplayConfig } from "@homarr/validation/custom-widget";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { catchTrpcNotFound } from "~/errors/trpc-catch-error";
import { CustomWidgetForm } from "../../_custom-widget-form";

const authTypeExpectedSecrets: Record<string, string[]> = {
  bearer: ["apiKey"],
  basic: ["username", "password"],
  apiKeyHeader: ["apiKey"],
  apiKeyQuery: ["apiKey"],
};

function buildInitialSecrets(
  authType: string,
  dbSecrets: Array<{ kind: string }>,
) {
  const expected = authTypeExpectedSecrets[authType] ?? [];
  const existingKinds = new Set(dbSecrets.map((s) => s.kind));
  const result = dbSecrets.map((s) => ({ kind: s.kind, value: "" }));
  for (const kind of expected) {
    if (!existingKinds.has(kind)) {
      result.push({ kind, value: "" });
    }
  }
  return result;
}

interface EditCustomWidgetPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCustomWidgetPage(props: EditCustomWidgetPageProps) {
  const params = await props.params;
  const definition = await api.customWidget.byId({ id: params.id }).catch(catchTrpcNotFound);

  const displayConfig = definition.displayConfig as DisplayConfig;

  return (
    <>
      <DynamicBreadcrumb dynamicMappings={new Map([[params.id, definition.name]])} nonInteractable={["edit"]} />
      <Container size="xl">
        <Stack>
          <Title>{definition.name}</Title>
          <CustomWidgetForm
            mode="edit"
            definitionId={params.id}
            initialValues={{
              name: definition.name,
              description: definition.description ?? "",
              iconUrl: definition.iconUrl ?? "",
              baseUrl: definition.baseUrl,
              authType: definition.authType,
              headerName: definition.headerName ?? "",
              endpoint: definition.endpoint,
              method: definition.method,
              requestBody: definition.requestBody ?? "",
              displayType: definition.displayType,
              jsonPath: displayConfig.type === "singleValue" ? displayConfig.jsonPath : "$",
              label: displayConfig.type === "singleValue" ? displayConfig.label : "",
              unit: displayConfig.type === "singleValue" ? displayConfig.unit : "",
              mappings:
                displayConfig.type === "keyValue" ? displayConfig.mappings : [{ label: "", jsonPath: "$", unit: "" }],
              tablePath: displayConfig.type === "table" ? displayConfig.tablePath : "$",
              columns: displayConfig.type === "table" ? displayConfig.columns : [{ header: "", jsonPath: "$" }],
              secrets: buildInitialSecrets(definition.authType, definition.secrets),
            }}
          />
        </Stack>
      </Container>
    </>
  );
}
