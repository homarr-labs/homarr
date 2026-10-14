import { useRef, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Fieldset,
  Group,
  Modal,
  PasswordInput,
  Select,
  Skeleton,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  EditorInputs,
  EditorOutputs,
  EditorTranslate,
  WidgetEditorClient,
  WidgetEditorDomain,
  WidgetEditorQueryUtils,
} from "./contracts";

type StoredDefinition = EditorOutputs["customWidget"]["get"];
type SecretKind = EditorInputs["customWidget"]["secretClear"]["kind"];

export function CustomWidgetSourceConfiguration(props: {
  definitionId: string;
  isAdmin: boolean;
  writesAvailable?: boolean;
  client: WidgetEditorClient;
  queryUtils: WidgetEditorQueryUtils;
  domain: WidgetEditorDomain;
  t: EditorTranslate;
  onConfigured(): void;
}) {
  const queries = props.queryUtils;
  const definition = useQuery(
    queries.customWidget.get.queryOptions({
      input: { id: props.definitionId },
      enabled: props.isAdmin,
      retry: false,
    }),
  );
  const integrations = useQuery(
    queries.integration.all.queryOptions({
      input: undefined,
      enabled: props.isAdmin,
      retry: false,
    }),
  );
  if (!props.isAdmin) return <Alert color="yellow">{props.t("nitro.widgetEditor.adminPermissionRequired")}</Alert>;
  if (definition.isPending) return <Skeleton h={220} />;
  if (!definition.data)
    return (
      <Alert color="red">
        <Button variant="subtle" onClick={() => void definition.refetch()}>
          {props.t("common.action.tryAgain")}
        </Button>
      </Alert>
    );
  return (
    <Stack gap="md">
      {Object.entries(definition.data.sources).map(([sourceId, source]) => (
        <SourceConfiguration
          key={`${definition.data?.id}:${sourceId}`}
          {...props}
          definition={definition.data}
          sourceId={sourceId}
          source={source}
          integrations={integrations.data ?? []}
          integrationsPending={integrations.isPending}
          integrationsError={integrations.isError}
          onRefreshIntegrations={() => void integrations.refetch()}
        />
      ))}
    </Stack>
  );
}

export type CustomWidgetSourceConfigurationProps = Parameters<typeof CustomWidgetSourceConfiguration>[0];

function SourceConfiguration(
  props: Parameters<typeof CustomWidgetSourceConfiguration>[0] & {
    definition: StoredDefinition;
    sourceId: string;
    source: StoredDefinition["sources"][string];
    integrations: EditorOutputs["integration"]["all"];
    integrationsPending: boolean;
    integrationsError: boolean;
    onRefreshIntegrations(): void;
  },
) {
  const { source, t } = props;
  const [baseUrl, setBaseUrl] = useState(source.type === "integration" ? "" : source.baseUrl);
  const [integrationId, setIntegrationId] = useState(source.type === "integration" ? source.integrationId : undefined);
  const [values, setValues] = useState<Partial<Record<SecretKind, string>>>({});
  const [clearKind, setClearKind] = useState<SecretKind | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const queryClient = useQueryClient();
  const queries = props.queryUtils;
  const requirements = props.domain.getCustomWidgetSecretRequirements({ [props.sourceId]: source });
  const configured = props.definition.secrets.filter((secret) => secret.sourceId === props.sourceId);
  const refresh = () => {
    void queryClient.invalidateQueries({
      queryKey: queries.customWidget.get.queryKey({ input: { id: props.definitionId } }),
    });
    void queryClient.invalidateQueries({ queryKey: queries.customWidget.available.key() });
    props.onConfigured();
  };
  const save = async () => {
    if (lock.current || !props.isAdmin || !props.writesAvailable) return;
    if (
      source.type === "integration" &&
      !props.integrations.some(
        (integration) =>
          integration.id === integrationId &&
          integration.kind === source.integrationKind &&
          integration.permissions.hasFullAccess,
      )
    ) {
      setError(t("item.edit.integration.fullAccessRequired"));
      return;
    }
    lock.current = true;
    setPending(true);
    setError(null);
    const input: EditorInputs["customWidget"]["sourceConfigure"] =
      source.type === "integration"
        ? {
            definitionId: props.definitionId,
            sourceId: props.sourceId,
            integrationId,
            secrets: [],
          }
        : {
            definitionId: props.definitionId,
            sourceId: props.sourceId,
            baseUrl,
            networkScope: source.networkScope,
            secrets: requirements.flatMap((requirement) =>
              values[requirement.kind]?.trim()
                ? [{ sourceId: props.sourceId, kind: requirement.kind, value: values[requirement.kind] ?? "" }]
                : [],
            ),
          };
    try {
      await props.client.customWidget.sourceConfigure(input);
      setValues({});
      refresh();
    } catch {
      setError(t("customWidget.notification.updateError"));
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  const clear = async () => {
    if (lock.current || !props.isAdmin || !clearKind || !props.writesAvailable) return;
    lock.current = true;
    setPending(true);
    setError(null);
    try {
      await props.client.customWidget.secretClear({
        definitionId: props.definitionId,
        sourceId: props.sourceId,
        kind: clearKind,
      });
      setClearKind(null);
      refresh();
    } catch {
      setError(t("customWidget.notification.updateError"));
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  return (
    <>
      <Fieldset legend={source.name ?? props.sourceId}>
        <Stack gap="sm">
          {!props.writesAvailable && <Alert color="yellow">{t("nitro.widgetEditor.draftWriterUnavailable")}</Alert>}
          {error && (
            <Alert color="red" role="alert">
              {error}
            </Alert>
          )}
          {source.type === "integration" ? (
            <>
              <Select
                label={t("item.edit.field.integrations.label")}
                value={integrationId ?? null}
                data={props.integrations
                  .filter(
                    (integration) =>
                      integration.kind === source.integrationKind && integration.permissions.hasFullAccess,
                  )
                  .map((integration) => ({ value: integration.id, label: integration.name }))}
                disabled={pending || props.integrationsPending || props.integrationsError}
                searchable
                onChange={(id) => setIntegrationId(id ?? undefined)}
              />
              {props.integrationsError && (
                <Button variant="subtle" onClick={props.onRefreshIntegrations}>
                  {t("common.action.tryAgain")}
                </Button>
              )}
            </>
          ) : (
            <>
              <TextInput
                label={t("customWidget.workbench.baseUrl")}
                value={baseUrl}
                disabled={pending}
                onChange={(event) => setBaseUrl(event.currentTarget.value)}
              />
              <Text size="xs">{t("nitro.widgetEditor.preservedNetworkScope", { scope: source.networkScope })}</Text>
              {requirements.map((requirement) => (
                <Stack key={requirement.kind} gap={4}>
                  <Group justify="space-between">
                    <Text size="sm">{t(`customWidget.workbench.${requirement.kind}`)}</Text>
                    {configured.some((secret) => secret.kind === requirement.kind) && (
                      <Badge color="green" variant="light">
                        {t("nitro.widgetEditor.secretConfigured")}
                      </Badge>
                    )}
                  </Group>
                  <PasswordInput
                    autoComplete="new-password"
                    aria-label={t(`customWidget.workbench.${requirement.kind}`)}
                    value={values[requirement.kind] ?? ""}
                    disabled={pending}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, [requirement.kind]: event.currentTarget.value }))
                    }
                  />
                  {configured.some((secret) => secret.kind === requirement.kind) && (
                    <Button
                      variant="subtle"
                      color="red"
                      disabled={pending || !props.writesAvailable}
                      onClick={() => setClearKind(requirement.kind)}
                    >
                      {t("common.action.remove")}
                    </Button>
                  )}
                </Stack>
              ))}
            </>
          )}
          <Group justify="flex-end">
            <Button
              loading={pending}
              disabled={
                !props.writesAvailable ||
                (source.type === "integration" &&
                  (!integrationId || props.integrationsError || props.integrationsPending))
              }
              onClick={() => void save()}
            >
              {t("common.action.saveChanges")}
            </Button>
          </Group>
        </Stack>
      </Fieldset>
      <Modal
        opened={clearKind !== null}
        onClose={() => !pending && setClearKind(null)}
        title={t("nitro.widgetEditor.removeSecretTitle")}
        closeOnClickOutside={false}
        closeButtonProps={{ disabled: pending }}
      >
        <Stack>
          <Text>{t("nitro.widgetEditor.removeSecretDescription", { provider: source.name ?? props.sourceId })}</Text>
          <Group justify="flex-end">
            <Button variant="default" disabled={pending} onClick={() => setClearKind(null)}>
              {t("common.action.cancel")}
            </Button>
            <Button color="red" loading={pending} onClick={() => void clear()}>
              {t("common.action.remove")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
