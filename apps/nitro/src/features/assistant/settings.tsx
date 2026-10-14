import {
  Alert,
  Autocomplete,
  Badge,
  Button,
  Divider,
  Group,
  PasswordInput,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import type { AssistantConfiguration, AssistantProvider } from "./client";
import { AssistantError, AssistantLoading, useAssistantAction, useAssistantFeature } from "./feature";

const settingsKey = "management.page.settings.section.assistant";

export function AssistantSettings() {
  const { client, access, queryKey, t } = useAssistantFeature();
  const admin = access.principal.user.permissions.includes("admin");
  const configuration = useQuery({
    queryKey: [...queryKey, "configuration"],
    queryFn: ({ signal }) =>
      client.assistant.getAdminConfiguration(undefined, { signal: AbortSignal.any([signal, access.signal]) }),
    enabled: admin,
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  if (!admin) return <Alert>{t("assistant.unavailable.notConfigured")}</Alert>;
  if (configuration.isPending) return <AssistantLoading />;
  if (configuration.isError) return <AssistantError retry={() => void configuration.refetch()} />;
  return (
    <AssistantSettingsForm
      key={`${configuration.data.provider}:${configuration.data.updatedAt?.toString() ?? "new"}`}
      configuration={configuration.data}
    />
  );
}

function AssistantSettingsForm({ configuration }: { readonly configuration: AssistantConfiguration }) {
  const { client, access, domain, queryKey, t, copy } = useAssistantFeature();
  const queryClient = useQueryClient();
  const action = useAssistantAction();
  const [provider, setProvider] = useState(configuration.provider);
  const [baseUrl, setBaseUrl] = useState(configuration.baseUrl);
  const [discoveryPath, setDiscoveryPath] = useState(configuration.modelDiscoveryPath ?? "");
  const [apiKey, setApiKey] = useState("");
  const [headers, setHeaders] = useState<{ id: number; name: string; value: string }[]>([]);
  const headerId = useRef(0);
  const [clearHeaders, setClearHeaders] = useState(false);
  const [clearKey, setClearKey] = useState(false);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const [modelId, setModelId] = useState(configuration.modelId ?? "");
  const [enabled, setEnabled] = useState(configuration.enabled);
  const [webSearch, setWebSearch] = useState(configuration.webSearchEnabled);
  const [notice, setNotice] = useState<"saved" | "connection" | "cleared" | null>(null);
  const s = (key: string, values?: Record<string, string | number>) => t(`${settingsKey}.${key}`, values);
  const homarr = provider === "homarr";
  const preset = domain.providerPresets[provider];
  const normalizedUrl = baseUrl.trim().replace(/\/$/u, "");
  const destinationChanged = configuration.provider !== provider || configuration.baseUrl !== normalizedUrl;
  const connectionChanged =
    !configuration.connectionConfigured ||
    destinationChanged ||
    configuration.modelDiscoveryPath !== (discoveryPath.trim() || null);
  const storedKey = configuration.apiKeyConfigured && !destinationChanged && !clearKey;
  const disabled = access.readOnly || action.pending;
  const canSaveConnection =
    Boolean(baseUrl.trim()) &&
    (!preset.requiresApiKey || storedKey || Boolean(apiKey.trim()) || clearKey) &&
    headers.every((header) => header.name.trim() && header.value) &&
    new Set(headers.map((header) => header.name.trim().toLowerCase())).size === headers.length;
  const models = useQuery({
    queryKey: [...queryKey, "models", configuration.provider, configuration.baseUrl, configuration.modelDiscoveryPath],
    queryFn: ({ signal }) =>
      client.assistant.discoverModels(undefined, { signal: AbortSignal.any([signal, access.signal]) }),
    enabled: configuration.connectionConfigured && Boolean(configuration.modelDiscoveryPath) && !connectionChanged,
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60_000,
  });
  const selectedModel = !connectionChanged ? models.data?.find((model) => model.id === modelId) : undefined;
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };
  const clearDraftSecrets = () => {
    setApiKey("");
    setHeaders([]);
    setClearKey(false);
    setClearHeaders(false);
  };
  const resetModel = () => {
    setModelId("");
    setEnabled(false);
    setWebSearch(false);
  };
  const changeProvider = (value: AssistantProvider | null) => {
    if (!value) return;
    const next = domain.providerPresets[value];
    clearDraftSecrets();
    resetModel();
    setProvider(value);
    setBaseUrl(
      value === "homarr" ? (configuration.provider === "homarr" ? configuration.baseUrl : next.baseUrl) : next.baseUrl,
    );
    setDiscoveryPath(next.modelDiscoveryPath ?? "");
  };

  return (
    <Stack component="section" aria-label={s("title")} maw={760}>
      <Title order={2}>{s("title")}</Title>
      <Text>{s("description")}</Text>
      <Text size="sm">{s("credentials.description")}</Text>
      {action.failed && <AssistantError message={s("notification.error.title")} />}
      {notice && (
        <Alert color="green">
          {s(
            notice === "saved"
              ? "notification.saved.title"
              : notice === "connection"
                ? "notification.connectionSaved.title"
                : "notification.connectionSaved.credentialsCleared",
          )}
        </Alert>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (disabled || !canSaveConnection) return;
          const input = {
            provider,
            baseUrl,
            modelDiscoveryPath: discoveryPath.trim() || null,
            ...(apiKey.trim() && !homarr && !clearKey ? { apiKey: apiKey.trim() } : {}),
            clearApiKey: clearKey || homarr,
            ...(headers.length > 0 && !homarr
              ? { customHeaders: Object.fromEntries(headers.map((header) => [header.name.trim(), header.value])) }
              : {}),
            clearCustomHeaders: clearHeaders || homarr,
          };
          clearDraftSecrets();
          void action.execute(async () => {
            const result = await client.assistant.updateConnection(input, { signal: access.signal });
            if (access.signal.aborted) return;
            setNotice(result.credentialsClearedForDestinationChange ? "cleared" : "connection");
            await refresh();
          });
        }}
      >
        <Stack>
          <Title order={3}>{s("connection.endpointTitle")}</Title>
          <Select<AssistantProvider>
            label={s("provider.title")}
            value={provider}
            searchable
            allowDeselect={false}
            disabled={disabled}
            data={domain.providerIds.map((id) => ({
              value: id,
              label: domain.providerPresets[id].label ?? s("provider.options.custom.label"),
            }))}
            onChange={changeProvider}
          />
          <TextInput
            label={s("baseUrl.title")}
            description={s("baseUrl.description")}
            value={baseUrl}
            maxLength={2048}
            disabled={disabled || homarr}
            required
            onChange={(event) => {
              clearDraftSecrets();
              resetModel();
              setBaseUrl(event.currentTarget.value);
            }}
          />
          <TextInput
            label={s("model.discoveryPath")}
            description={s("model.discoveryPathDescription")}
            value={discoveryPath}
            maxLength={512}
            disabled={disabled || homarr}
            onChange={(event) => {
              setModelId("");
              setEnabled(false);
              setDiscoveryPath(event.currentTarget.value);
            }}
          />
          {destinationChanged && configuration.connectionConfigured && (
            <Alert color="yellow">{s("notification.connectionSaved.credentialsCleared")}</Alert>
          )}
          <Divider />
          <Title order={3}>{s("credentials.title")}</Title>
          {homarr ? (
            <Text>{s("provider.homarrAuth.description")}</Text>
          ) : (
            <>
              {storedKey && <Badge color="green">{s("apiKey.savedTitle")}</Badge>}
              <PasswordInput
                label={s("apiKey.title")}
                description={s(preset.requiresApiKey ? "apiKey.required" : "apiKey.optional")}
                value={apiKey}
                maxLength={2048}
                autoComplete="new-password"
                disabled={disabled || clearKey}
                onChange={(event) => setApiKey(event.currentTarget.value)}
              />
              {configuration.apiKeyConfigured && !destinationChanged && (
                <Switch
                  label={s("apiKey.remove")}
                  checked={clearKey}
                  disabled={disabled}
                  onChange={(event) => {
                    setClearKey(event.currentTarget.checked);
                    setApiKey("");
                  }}
                />
              )}
              {clearKey && (
                <Alert color="yellow">
                  {s(preset.requiresApiKey ? "apiKey.removeFlow.description" : "apiKey.removeFlow.optionalDescription")}
                </Alert>
              )}
              <Text fw={600}>{s("headers.title")}</Text>
              <Text size="sm">
                {s(
                  configuration.customHeadersConfigured && !destinationChanged ? "headers.configured" : "headers.empty",
                )}
              </Text>
              {headers.map((header) => (
                <Group key={header.id} align="end">
                  <TextInput
                    flex={1}
                    label={s("headers.name")}
                    value={header.name}
                    maxLength={128}
                    disabled={disabled}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setHeaders((current) =>
                        current.map((entry) => (entry.id === header.id ? { ...entry, name: value } : entry)),
                      );
                    }}
                  />
                  <PasswordInput
                    flex={1}
                    label={s("headers.value")}
                    value={header.value}
                    maxLength={2048}
                    autoComplete="new-password"
                    disabled={disabled}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setHeaders((current) =>
                        current.map((entry) => (entry.id === header.id ? { ...entry, value } : entry)),
                      );
                    }}
                  />
                  <Button
                    variant="default"
                    disabled={disabled}
                    onClick={() => setHeaders((current) => current.filter((entry) => entry.id !== header.id))}
                  >
                    {s("headers.remove")}
                  </Button>
                </Group>
              ))}
              <Group>
                <Button
                  variant="default"
                  disabled={disabled || headers.length >= 20}
                  onClick={() => {
                    headerId.current += 1;
                    setHeaders((current) => [...current, { id: headerId.current, name: "", value: "" }]);
                    setClearHeaders(false);
                  }}
                >
                  {s("headers.add")}
                </Button>
                {configuration.customHeadersConfigured && !destinationChanged && (
                  <Switch
                    checked={clearHeaders}
                    label={s("headers.clear")}
                    disabled={disabled || headers.length > 0}
                    onChange={(event) => setClearHeaders(event.currentTarget.checked)}
                  />
                )}
              </Group>
            </>
          )}
          <Button type="submit" disabled={disabled || !canSaveConnection} loading={action.pending}>
            {s("connection.save")}
          </Button>
        </Stack>
      </form>
      <Divider />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (disabled || connectionChanged || !modelId.trim()) return;
          void action.execute(async () => {
            await client.assistant.updateConfiguration(
              { enabled, modelId: modelId.trim(), webSearchEnabled: domain.canUseServerTools(provider) && webSearch },
              { signal: access.signal },
            );
            if (access.signal.aborted) return;
            setNotice("saved");
            await refresh();
          });
        }}
      >
        <Stack>
          <Title order={3}>{s("model.title")}</Title>
          {connectionChanged && <Alert>{s("model.saveConnectionFirst")}</Alert>}
          {models.isError && (
            <AssistantError
              message={s("model.manualFallback")}
              retry={!connectionChanged ? () => void models.refetch() : undefined}
            />
          )}
          <Autocomplete
            label={s("model.title")}
            description={s("model.description")}
            value={modelId}
            disabled={disabled || connectionChanged}
            maxLength={256}
            data={
              !connectionChanged
                ? (models.data?.map((model) => ({ value: model.id, label: domain.modelLabel(model) })) ?? [])
                : []
            }
            onChange={setModelId}
          />
          <Button
            variant="default"
            disabled={disabled || connectionChanged || !configuration.modelDiscoveryPath}
            loading={models.isFetching}
            onClick={() => void models.refetch()}
          >
            {s("model.refresh")}
          </Button>
          {selectedModel && (
            <Group gap="sm">
              {selectedModel.contextLength !== null && (
                <Text size="sm">{s("model.context", { count: selectedModel.contextLength })}</Text>
              )}
              <Badge>
                {s(selectedModel.toolSupport === "confirmed" ? "model.toolsConfirmed" : "model.toolsUnknown")}
              </Badge>
            </Group>
          )}
          <Switch
            label={s("enabled.label")}
            description={s("enabled.description")}
            checked={enabled}
            disabled={disabled || connectionChanged}
            onChange={(event) => setEnabled(event.currentTarget.checked)}
          />
          <Switch
            label={s("serverTools.webSearch.label")}
            description={s(
              provider === "custom" ? "serverTools.webSearch.proxyDescription" : "serverTools.webSearch.description",
            )}
            checked={domain.canUseServerTools(provider) && webSearch}
            disabled={disabled || connectionChanged || !domain.canUseServerTools(provider)}
            onChange={(event) => setWebSearch(event.currentTarget.checked)}
          />
          <Button type="submit" disabled={disabled || connectionChanged || !modelId.trim()} loading={action.pending}>
            {s("save")}
          </Button>
        </Stack>
      </form>
      {!homarr && configuration.connectionConfigured && (
        <Stack>
          <Button color="red" variant="subtle" disabled={disabled} onClick={() => setConfirmRemoval(true)}>
            {copy.clearCredentialsAction}
          </Button>
          {confirmRemoval && (
            <Alert color="yellow" title={copy.clearCredentialsTitle}>
              <Stack gap="sm">
                <Text size="sm">{copy.clearCredentialsDescription}</Text>
                <Group>
                  <Button
                    color="red"
                    disabled={disabled}
                    loading={action.pending}
                    onClick={() => {
                      clearDraftSecrets();
                      void action.execute(async () => {
                        await client.assistant.clearCredentials(undefined, { signal: access.signal });
                        if (access.signal.aborted) return;
                        setConfirmRemoval(false);
                        await refresh();
                      });
                    }}
                  >
                    {copy.clearCredentialsAction}
                  </Button>
                  <Button variant="default" disabled={action.pending} onClick={() => setConfirmRemoval(false)}>
                    {s("apiKey.removeFlow.cancel")}
                  </Button>
                </Group>
              </Stack>
            </Alert>
          )}
        </Stack>
      )}
    </Stack>
  );
}
