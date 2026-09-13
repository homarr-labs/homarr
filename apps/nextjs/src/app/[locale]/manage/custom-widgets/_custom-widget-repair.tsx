"use client";

import { useState } from "react";
import { Alert, Button, Group, Stack, Text, Title } from "@mantine/core";
import { parse } from "superjson";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { customWidgetDefinitionSchema } from "@homarr/custom-widgets/core";
import { useI18n } from "@homarr/translation/client";

import { CodeEditor } from "~/components/custom-widgets/code-editor";

function readStored(value: string): unknown {
  try {
    return parse(value);
  } catch {
    return value;
  }
}

export function CustomWidgetRepair({ definition }: { definition: RouterOutputs["customWidget"]["getRaw"] }) {
  const t = useI18n("customWidget.workbench.repair");
  const [source, setSource] = useState(() =>
    JSON.stringify(
      {
        $schema: "homarr-custom-widget-v2",
        name: definition.name,
        description: definition.description ?? undefined,
        iconUrl: definition.iconUrl ?? undefined,
        sources: readStored(definition.sources),
        requests: readStored(definition.requests),
        options: readStored(definition.options),
        template: definition.template,
      },
      null,
      2,
    ),
  );
  const [error, setError] = useState("");
  const repair = clientApi.customWidget.repair.useMutation();
  const save = async () => {
    try {
      const parsed: unknown = JSON.parse(source);
      const widget = customWidgetDefinitionSchema.parse(parsed);
      const result = await repair.mutateAsync({ id: definition.id, widget });
      window.location.assign(result.managementPath);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([source], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${definition.id}-repair.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Stack>
      <Title>
        {t("title")}: {definition.name}
      </Title>
      <Alert color="yellow">
        <Text>{t("description")}</Text>
        {definition.issues.map((issue, index) => (
          <Text size="sm" key={index}>
            {issue.path}: {issue.message}
          </Text>
        ))}
      </Alert>
      {error && <Alert color="red">{error}</Alert>}
      <CodeEditor
        id="repair-source"
        label={t("source")}
        language="json"
        value={source}
        onChange={setSource}
        height="60vh"
      />
      <Group>
        <Button loading={repair.isPending} onClick={() => void save()}>
          {t("save")}
        </Button>
        <Button variant="default" onClick={download}>
          {t("export")}
        </Button>
      </Group>
    </Stack>
  );
}
