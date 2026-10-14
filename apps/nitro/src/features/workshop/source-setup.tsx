import { useState } from "react";
import { Alert, Select, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import { WorkshopSecurityReviewContent } from "../../source-ui/workshop";

import type { WorkshopSecrets, WorkshopSourceSetup, WorkshopSourceValue, WorkshopWidget } from "./client";
import { useWorkshopFeature, WorkshopFailure } from "./scope";

const secretKinds = ["apiKey", "username", "password"] as const;

export function collectWorkshopSecrets(values: Record<string, WorkshopSourceValue>): WorkshopSecrets {
  return Object.entries(values).flatMap(([sourceId, value]) =>
    secretKinds.flatMap((kind) => {
      const secret = value.secrets[kind];
      return secret?.trim() ? [{ sourceId, kind, value: secret }] : [];
    }),
  );
}

export function useWorkshopSourceSetup(widget: WorkshopWidget, setups?: WorkshopSourceSetup[]) {
  const { core, workbench, client, queryKey } = useWorkshopFeature();
  const sourceSetups = setups ?? core.getCustomWidgetSourceSetups(widget.sources);
  const integrations = useQuery({
    queryKey: [...queryKey, "integrations"],
    enabled: sourceSetups.some((setup) => Boolean(setup.integrationKind)),
    queryFn: ({ signal }) => client.integration.all(undefined, { signal }),
  });
  const [values, setValues] = useState(() => workbench.createCustomWidgetSourceSetupValues(sourceSetups));
  const sources = Object.fromEntries(
    Object.entries(values).map(([sourceId, value]) => [
      sourceId,
      {
        baseUrl: value.baseUrl,
        networkScope: value.networkScope,
        integrationId: value.integrationId,
      },
    ]),
  );
  const configuredWidget = { ...widget, sources: core.applyCustomWidgetSourceSetup(widget.sources, sources) };
  return {
    setups: sourceSetups,
    values,
    sources,
    configuredWidget,
    secrets: collectWorkshopSecrets(values),
    ready:
      workbench.isCustomWidgetSourceSetupReady(sourceSetups, values) &&
      sourceSetups.every(
        (setup) =>
          !setup.integrationKind ||
          integrations.data?.some(
            (integration) =>
              integration.id === values[setup.sourceId]?.integrationId &&
              integration.kind === setup.integrationKind &&
              integration.permissions.hasFullAccess,
          ),
      ),
    setValue: (sourceId: string, value: WorkshopSourceValue) =>
      setValues((current) => ({ ...current, [sourceId]: value })),
    clearSecrets: () =>
      setValues((current) =>
        Object.fromEntries(Object.entries(current).map(([id, value]) => [id, { ...value, secrets: {} }])),
      ),
  };
}

export function WorkshopSourceSetupPanel({
  setups,
  values,
  onChange,
  disabled = false,
}: {
  setups: WorkshopSourceSetup[];
  values: Record<string, WorkshopSourceValue>;
  onChange(sourceId: string, value: WorkshopSourceValue): void;
  disabled?: boolean;
}) {
  const { workbench } = useWorkshopFeature();
  const SourceSetupPanel = workbench.CustomWidgetSourceSetupPanel;
  return (
    <fieldset disabled={disabled} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <SourceSetupPanel
        setups={setups}
        values={values}
        onChange={onChange}
        messages={{
          title: "Configure local sources",
          description:
            "Confirm HTTP destinations or bind a saved integration. Credentials stay on this Homarr instance.",
          suggestedUrl: "Suggested destination",
          baseUrl: "Base URL",
          networkScope: "Network scope",
          authentication: "Authentication",
          confirmUrl: "I confirm this destination belongs to my intended service",
          ready: "Destination confirmed",
          needsUrl: "Confirm destination",
          credentialsMissing: "Credentials missing",
          credentialsOptional: "You can install now, but requests need their credentials before they work.",
          configured: "Stored credential retained",
          secret: (kind) => (kind === "apiKey" ? "API key" : kind === "username" ? "Username" : "Password"),
          urlError: () =>
            "Use a valid HTTP(S) service URL matching the selected network scope, without embedded credentials.",
        }}
        renderIntegrationSource={(setup, value) => (
          <WorkshopIntegrationSource
            setup={setup}
            value={value}
            disabled={disabled}
            onChange={(next) => onChange(setup.sourceId, next)}
          />
        )}
      />
    </fieldset>
  );
}

function WorkshopIntegrationSource({
  setup,
  value,
  onChange,
  disabled,
}: {
  setup: WorkshopSourceSetup;
  value: WorkshopSourceValue;
  onChange(value: WorkshopSourceValue): void;
  disabled: boolean;
}) {
  const { client, queryKey } = useWorkshopFeature();
  const query = useQuery({
    queryKey: [...queryKey, "integrations"],
    queryFn: ({ signal }) => client.integration.all(undefined, { signal }),
  });
  const kinds = useQuery({
    queryKey: [...queryKey, "integrationKinds"],
    queryFn: ({ signal }) => client.integration.getKinds(undefined, { signal }),
  });
  const integrations =
    query.data?.filter(
      (integration) => integration.kind === setup.integrationKind && integration.permissions.hasFullAccess,
    ) ?? [];
  const unavailable =
    query.isSuccess && Boolean(value.integrationId) && !integrations.some(({ id }) => id === value.integrationId);
  return (
    <Stack gap="xs">
      <Select
        label="Saved integration"
        description={kinds.data?.find((kind) => kind.kind === setup.integrationKind)?.name ?? setup.integrationKind}
        searchable
        clearable
        disabled={disabled || query.isPending || query.isError}
        data={integrations.map(({ id, name }) => ({ value: id, label: name }))}
        value={value.integrationId ?? null}
        error={unavailable ? "The saved integration is no longer available with full access." : undefined}
        nothingFoundMessage="No matching integrations with full access"
        onChange={(integrationId) => onChange({ ...value, integrationId: integrationId ?? undefined })}
      />
      {query.isError && <WorkshopFailure error={query.error} retry={() => void query.refetch()} />}
      {kinds.isError && (
        <Alert color="yellow">
          Integration names could not be loaded. The required integration kind is shown instead.
        </Alert>
      )}
      <Text size="sm">
        Only matching saved integrations with full access can be bound. Homarr rechecks permission and source authority
        on the server.
      </Text>
    </Stack>
  );
}

export function WorkshopSecurityReview({ widget }: { widget: WorkshopWidget }) {
  const { core } = useWorkshopFeature();
  return <WorkshopSecurityReviewContent review={core.getImportReview(widget)} />;
}
