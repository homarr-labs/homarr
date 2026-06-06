import { Container, Stack } from "@mantine/core";

import { api } from "@homarr/api/server";
import type { FlowGraph } from "@homarr/custom-widget-nodes";
import { getScopedI18n } from "@homarr/translation/server";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { catchTrpcNotFound } from "~/errors/trpc-catch-error";
import { FlowEditorClient } from "./_flow-editor-client";

interface FlowEditorPageProps {
  params: Promise<{ id: string }>;
}

export default async function FlowEditorPage(props: FlowEditorPageProps) {
  const params = await props.params;
  const t = await getScopedI18n("customWidget");
  const definition = await api.customWidget.byId({ id: params.id }).catch(catchTrpcNotFound);

  let initialGraph: FlowGraph | undefined;
  if (definition.flowGraph) {
    try {
      initialGraph = JSON.parse(definition.flowGraph as string) as FlowGraph;
    } catch {
      initialGraph = undefined;
    }
  }

  return (
    <>
      <DynamicBreadcrumb
        dynamicMappings={
          new Map([
            [params.id, definition.name],
            ["flow", t("action.flowEditor")],
          ])
        }
        nonInteractable={["edit", "flow"]}
      />
      <Container fluid h="calc(100vh - 120px)" p={0}>
        <Stack h="100%" gap={0}>
          <FlowEditorClient definitionId={params.id} initialGraph={initialGraph} />
        </Stack>
      </Container>
    </>
  );
}
