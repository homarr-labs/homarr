import { Alert, Button, Skeleton } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import { CustomWidgetAuthoring } from "./custom-widget-authoring";

export function CustomWidgetDefinitionEditor(
  props: Omit<Parameters<typeof CustomWidgetAuthoring>[0], "initialValues">,
) {
  const queries = props.queryUtils;
  const definition = useQuery(
    queries.customWidget.get.queryOptions({
      input: { id: props.definitionId ?? "" },
      enabled: Boolean(props.definitionId) && props.isAdmin,
      retry: false,
      refetchOnWindowFocus: false,
    }),
  );
  if (!props.isAdmin) return <Alert color="yellow">{props.t("nitro.widgetEditor.adminPermissionRequired")}</Alert>;
  if (!props.definitionId) return <CustomWidgetAuthoring {...props} />;
  if (definition.isPending) return <Skeleton h={400} />;
  if (!definition.data)
    return (
      <Alert color="red">
        <Button variant="subtle" onClick={() => void definition.refetch()}>
          {props.t("common.action.tryAgain")}
        </Button>
      </Alert>
    );
  const value = definition.data;
  return (
    <CustomWidgetAuthoring
      key={value.id}
      {...props}
      initialValues={{
        name: value.name,
        description: value.description ?? "",
        iconUrl: value.iconUrl ?? "",
        sources: JSON.stringify(value.sources, null, 2),
        requests: JSON.stringify(value.requests, null, 2),
        options: JSON.stringify(value.options, null, 2),
        template: value.template,
        secrets: value.secrets.map((secret) => ({
          sourceId: secret.sourceId,
          kind: secret.kind,
          value: "",
          hasValue: secret.hasValue,
        })),
      }}
    />
  );
}

export type CustomWidgetDefinitionEditorProps = Parameters<typeof CustomWidgetDefinitionEditor>[0];
