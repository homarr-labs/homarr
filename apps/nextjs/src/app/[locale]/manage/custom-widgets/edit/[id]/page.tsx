import { redirect } from "next/navigation";
import { Container, Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";

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

function buildDisplayInitialValues(displayType: string, config: Record<string, unknown>) {
  const base = {
    displayType,
    jsonPath: "$",
    label: "",
    unit: "",
    valueSize: "lg",
    labelPosition: "below",
    mappings: [{ label: "", jsonPath: "$", unit: "" }],
    kvLayout: "list",
    kvColumns: 2,
    tablePath: "$",
    columns: [{ header: "", jsonPath: "$" }],
    striped: true,
    compact: false,
    statGridItems: [{ label: "", jsonPath: "$", unit: "", color: "blue" }],
    statGridColumns: 2,
    cardStyle: "filled",
    progressBars: [{ label: "", valuePath: "$", maxPath: "", unit: "", color: "blue" }],
    showPercentage: true,
    barSize: "md",
    statusItems: [{ label: "", jsonPath: "$", goodValues: "online,true" }],
    statusLayout: "list",
    dotSize: "md",
    countGridItems: [{ label: "", jsonPath: "$", unit: "" }],
    countGridColumns: 2,
    countValueSize: "md",
    rawJsonPath: "$",
    rawMaxHeight: 300,
    buttonLabel: "Execute",
    buttonColor: "blue",
    confirmText: "",
    successMessage: "",
    template: "",
  };

  const typeOverrides: Record<string, () => Record<string, unknown>> = {
    singleValue: () => ({
      jsonPath: (config.jsonPath as string) ?? "$",
      label: (config.label as string) ?? "",
      unit: (config.unit as string) ?? "",
      valueSize: (config.valueSize as string) ?? "lg",
      labelPosition: (config.labelPosition as string) ?? "below",
    }),
    keyValue: () => ({
      mappings: (config.mappings as Array<{ label: string; jsonPath: string; unit: string }>) ?? base.mappings,
      kvLayout: (config.layout as string) ?? "list",
      kvColumns: (config.columns as number) ?? 2,
    }),
    table: () => ({
      tablePath: (config.tablePath as string) ?? "$",
      columns: (config.columns as Array<{ header: string; jsonPath: string }>) ?? base.columns,
      striped: (config.striped as boolean) ?? true,
      compact: (config.compact as boolean) ?? false,
    }),
    statGrid: () => ({
      statGridItems: (
        (config.items as Array<{ label: string; jsonPath: string; unit: string; color?: string }>) ?? []
      ).map((item) => ({
        label: item.label,
        jsonPath: item.jsonPath,
        unit: item.unit,
        color: item.color ?? "blue",
      })),
      statGridColumns: (config.columns as number) ?? 2,
      cardStyle: (config.cardStyle as string) ?? "filled",
    }),
    progressBars: () => ({
      progressBars: (
        (config.bars as Array<{ label: string; valuePath: string; maxPath?: string; unit: string; color?: string }>) ??
        []
      ).map((bar) => ({
        label: bar.label,
        valuePath: bar.valuePath,
        maxPath: bar.maxPath ?? "",
        unit: bar.unit,
        color: bar.color ?? "blue",
      })),
      showPercentage: (config.showPercentage as boolean) ?? true,
      barSize: (config.barSize as string) ?? "md",
    }),
    statusIndicator: () => ({
      statusItems: ((config.items as Array<{ label: string; jsonPath: string; goodValues: string[] }>) ?? []).map(
        (item) => ({
          label: item.label,
          jsonPath: item.jsonPath,
          goodValues: item.goodValues.join(", "),
        }),
      ),
      statusLayout: (config.layout as string) ?? "list",
      dotSize: (config.dotSize as string) ?? "md",
    }),
    countGrid: () => ({
      countGridItems: (config.items as Array<{ label: string; jsonPath: string; unit: string }>) ?? base.countGridItems,
      countGridColumns: (config.columns as number) ?? 2,
      countValueSize: (config.valueSize as string) ?? "md",
    }),
    raw: () => ({
      rawJsonPath: (config.jsonPath as string) ?? "$",
      rawMaxHeight: (config.maxHeight as number) ?? 300,
    }),
    actionButton: () => ({
      buttonLabel: (config.buttonLabel as string) ?? "Execute",
      buttonColor: (config.buttonColor as string) ?? "blue",
      confirmText: (config.confirmText as string) ?? "",
      successMessage: (config.successMessage as string) ?? "",
    }),
    customJsx: () => ({
      template: (config.template as string) ?? "",
    }),
  };

  const overrides = typeOverrides[displayType]?.() ?? {};
  return { ...base, ...overrides };
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
  const displayValues = buildDisplayInitialValues(definition.displayType, displayConfig);

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
