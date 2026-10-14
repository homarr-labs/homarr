import { useState } from "react";
import { Alert, Anchor, Button, Code, Group, Loader, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import type { WorkshopFeatureClient, WorkshopSourceSetup, WorkshopWidget } from "./client";
import { useWorkshopMutation } from "./flow";
import { useInvalidateWorkshop, useWorkshopFeature, WorkshopFailure } from "./scope";
import { useWorkshopSourceSetup, WorkshopSourceSetupPanel } from "./source-setup";

export function WorkshopSourceConfiguration({ definitionId }: { definitionId: string }) {
  const { client, core, queryKey } = useWorkshopFeature();
  const query = useQuery({
    queryKey: [...queryKey, "definition", definitionId],
    queryFn: ({ signal }) => client.customWidget.get({ id: definitionId }, { signal }),
  });
  if (query.isPending) return <Loader aria-label="Loading widget source configuration" size="sm" />;
  if (query.isError) return <WorkshopFailure error={query.error} retry={() => void query.refetch()} />;
  const setups = core.getCustomWidgetSourceSetups(query.data.sources, query.data.secrets);
  return (
    <Stack>
      <Text fw={600}>Configure {query.data.name}</Text>
      <Text size="sm">
        Existing credentials are never read back. Empty credential fields preserve stored values when their security
        binding remains compatible.
      </Text>
      {setups.map((setup) => (
        <WorkshopConfigureSource
          key={`${definitionId}:${setup.sourceId}:${JSON.stringify(query.data.sources[setup.sourceId])}:${query.data.updatedAt}`}
          definitionId={definitionId}
          widget={query.data}
          setup={setup}
        />
      ))}
    </Stack>
  );
}

function WorkshopConfigureSource({
  definitionId,
  widget,
  setup: sourceSetup,
}: {
  definitionId: string;
  widget: WorkshopWidget;
  setup: WorkshopSourceSetup;
}) {
  const { client, readOnly } = useWorkshopFeature();
  const invalidate = useInvalidateWorkshop();
  const source = widget.sources[sourceSetup.sourceId];
  const setup = useWorkshopSourceSetup({ ...widget, sources: source ? { [sourceSetup.sourceId]: source } : {} }, [
    sourceSetup,
  ]);
  const save = useWorkshopMutation({
    identity: JSON.stringify(["source", definitionId, sourceSetup.sourceId, source]),
    mutationFn: (input: Parameters<WorkshopFeatureClient["customWidget"]["sourceConfigure"]>[0], lease) =>
      client.customWidget.sourceConfigure(input, { signal: lease.signal }),
    onSuccess: (_result, lease) => {
      setup.clearSecrets();
      void invalidate(lease);
    },
  });
  return (
    <Stack>
      <WorkshopSourceSetupPanel
        setups={[sourceSetup]}
        values={setup.values}
        onChange={setup.setValue}
        disabled={readOnly || save.isPending}
      />
      {save.isError && <WorkshopFailure error={save.error} />}
      {save.isSuccess && <Alert color="green">Source configuration saved.</Alert>}
      <Group>
        <Button
          loading={save.isPending}
          disabled={readOnly || save.isPending || !setup.ready}
          onClick={() => {
            const value = setup.values[sourceSetup.sourceId];
            if (!value || !setup.ready || readOnly || save.isPending) return;
            if (sourceSetup.integrationKind)
              save.mutate({ definitionId, sourceId: sourceSetup.sourceId, integrationId: value.integrationId });
            else
              save.mutate({
                definitionId,
                sourceId: sourceSetup.sourceId,
                baseUrl: value.baseUrl,
                networkScope: value.networkScope,
                secrets: setup.secrets,
              });
          }}
        >
          Save source configuration
        </Button>
      </Group>
      {!sourceSetup.integrationKind && (
        <WorkshopConfigurationRequest target={{ definitionId }} sourceId={sourceSetup.sourceId} />
      )}
    </Stack>
  );
}

interface WorkshopConfigurationRequestProps {
  target: { definitionId: string; previewSessionId?: never } | { previewSessionId: string; definitionId?: never };
  sourceId: string;
}

export function WorkshopConfigurationRequest({ target, sourceId }: WorkshopConfigurationRequestProps) {
  const identity = JSON.stringify([
    target.definitionId === undefined ? "preview" : "definition",
    target.definitionId ?? target.previewSessionId,
    sourceId,
  ]);
  return <WorkshopConfigurationRequestFlow key={identity} target={target} sourceId={sourceId} identity={identity} />;
}

function WorkshopConfigurationRequestFlow({
  target,
  sourceId,
  identity,
}: WorkshopConfigurationRequestProps & { identity: string }) {
  const { client, readOnly } = useWorkshopFeature();
  const [requestId, setRequestId] = useState<string | null>(null);
  const create = useWorkshopMutation({
    identity: JSON.stringify(["configuration-create", identity]),
    mutationFn: (_input: undefined, lease) =>
      client.customWidget.configurationRequestUser({ ...target, sourceId }, { signal: lease.signal }),
    onSuccess: (result) => setRequestId(result.requestId),
  });
  const status = useWorkshopMutation({
    identity: JSON.stringify(["configuration-status", identity, requestId]),
    mutationFn: (_input: undefined, lease) => {
      if (!requestId) throw new Error("No configuration request exists");
      return client.customWidget.configurationRequestUser({ requestId }, { signal: lease.signal });
    },
  });
  const result = status.data ?? create.data;
  return (
    <Stack gap="xs">
      <Group>
        <Button
          variant="default"
          disabled={readOnly || create.isPending || Boolean(requestId)}
          loading={create.isPending}
          onClick={() => create.mutate(undefined)}
        >
          Open private configuration request
        </Button>
        {requestId && (
          <Button
            variant="subtle"
            disabled={readOnly || status.isPending}
            loading={status.isPending}
            onClick={() => status.mutate(undefined)}
          >
            Check configuration status
          </Button>
        )}
      </Group>
      {create.data && "url" in create.data && (
        <Anchor href={create.data.url} target="_blank" rel="noopener noreferrer">
          Configure source in Homarr
        </Anchor>
      )}
      {result && (
        <Text component="output" size="sm" aria-live="polite">
          Status: {result.status}. Expires: {String(result.expiresAt)}.
        </Text>
      )}
      {(create.isError || status.isError) && <WorkshopFailure error={create.error ?? status.error} />}
      <Text size="sm">
        This short-lived link is private to the current administrator. It is not part of the portable export.
      </Text>
    </Stack>
  );
}

export function WorkshopTemplate({ definitionId }: { definitionId: string }) {
  const { client, queryKey } = useWorkshopFeature();
  const query = useQuery({
    queryKey: [...queryKey, "template", definitionId],
    queryFn: ({ signal }) => client.customWidget.readTemplate({ id: definitionId }, { signal }),
  });
  if (query.isPending) return <Loader aria-label="Loading stored JSX template" size="sm" />;
  if (query.isError) return <WorkshopFailure error={query.error} retry={() => void query.refetch()} />;
  return (
    <Stack>
      <Text size="sm">
        {query.data.name}, template revision {query.data.revision}
      </Text>
      <Code block style={{ maxHeight: "24rem", overflow: "auto" }}>
        {query.data.template}
      </Code>
      <Text size="sm">
        Template authoring belongs to the widget editor. Updates here use an exact tested preview, not an unguarded
        template write.
      </Text>
    </Stack>
  );
}
