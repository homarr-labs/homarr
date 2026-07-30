"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Image,
  LoadingOverlay,
  PasswordInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconDatabaseSearch,
  IconKey,
  IconPlus,
  IconShieldLock,
  IconTool,
  IconTrash,
  IconWorld,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import {
  assistantProviderIds,
  assistantProviderPresets,
  getAssistantModelOptionLabel,
  resolveAssistantModelId,
} from "@homarr/definitions";
import type { AssistantProvider, AssistantProviderCategory } from "@homarr/definitions";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

type HeaderEntry = { id: number; name: string; value: string };

const ProviderIcon = ({ providerId, size = 20 }: { providerId: AssistantProvider; size?: number }) => {
  const iconUrl = assistantProviderPresets[providerId].iconUrl;
  return iconUrl ? (
    <Image src={iconUrl} alt="" aria-hidden w={size} h={size} fit="contain" />
  ) : (
    <IconWorld size={size} aria-hidden />
  );
};

export const AssistantConfiguration = () => {
  const t = useScopedI18n("management.page.settings.section.assistant");
  const utils = clientApi.useUtils();
  const { data: configuration, isLoading } = clientApi.assistant.getAdminConfiguration.useQuery();
  const [provider, setProvider] = useState<AssistantProvider>("openrouter");
  const [baseUrl, setBaseUrl] = useState<string>(assistantProviderPresets.openrouter.baseUrl);
  const [modelDiscoveryPath, setModelDiscoveryPath] = useState<string>("/models");
  const [apiKey, setApiKey] = useState("");
  const [clearApiKey, setClearApiKey] = useState(false);
  const [headers, setHeaders] = useState<HeaderEntry[]>([]);
  const [clearHeaders, setClearHeaders] = useState(false);
  const [nextHeaderId, setNextHeaderId] = useState(1);
  const [modelId, setModelId] = useState("");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setProvider(configuration?.provider ?? "openrouter");
    setBaseUrl(configuration?.baseUrl ?? assistantProviderPresets.openrouter.baseUrl);
    setModelDiscoveryPath(configuration?.modelDiscoveryPath ?? "");
    setModelId(configuration?.modelId ?? "");
    setEnabled(configuration?.enabled ?? false);
  }, [configuration]);

  const normalizedBaseUrl = baseUrl.trim().replace(/\/$/, "");
  const normalizedModelDiscoveryPath = modelDiscoveryPath.trim() || null;
  const destinationChanged =
    configuration?.connectionConfigured === true &&
    (configuration.provider !== provider || configuration.baseUrl !== normalizedBaseUrl);
  const connectionChanged =
    configuration?.connectionConfigured === true &&
    (destinationChanged || configuration.modelDiscoveryPath !== normalizedModelDiscoveryPath);

  const {
    data: models,
    error: discoveryError,
    isFetching: isDiscovering,
    refetch: discoverModels,
  } = clientApi.assistant.discoverModels.useQuery(undefined, {
    enabled:
      configuration?.connectionConfigured === true && configuration.modelDiscoveryPath !== null && !connectionChanged,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const modelOptions = useMemo(
    () =>
      (models ?? []).map((model) => ({
        value: model.id,
        label: getAssistantModelOptionLabel(model),
      })),
    [models],
  );
  const providerOptions = useMemo(
    () =>
      (["hosted", "local", "custom"] satisfies AssistantProviderCategory[]).map((category) => ({
        group: t(`provider.groups.${category}`),
        items: assistantProviderIds
          .filter((providerId) => assistantProviderPresets[providerId].category === category)
          .map((providerId) => ({
            value: providerId,
            label: t(`provider.options.${providerId}.label`),
          })),
      })),
    [t],
  );
  const selectedModel = connectionChanged ? undefined : models?.find((model) => model.id === modelId);
  const hasDiscoveredModels = !connectionChanged && (models?.length ?? 0) > 0;

  useEffect(() => {
    if (!models || models.length === 0) return;
    const resolvedModelId = resolveAssistantModelId(models, modelId);
    if (resolvedModelId && resolvedModelId !== modelId) {
      setModelId(resolvedModelId);
    }
  }, [modelId, models]);

  const preset = assistantProviderPresets[provider];
  const headerValuesValid = headers.every((header) => header.name.trim().length > 0 && header.value.length > 0);
  const hasEffectiveApiKey =
    apiKey.trim().length > 0 || (!destinationChanged && configuration?.apiKeyConfigured === true && !clearApiKey);
  const connectionValid =
    baseUrl.trim().length > 0 && headerValuesValid && (!preset.requiresApiKey || hasEffectiveApiKey);
  const connectionPending = configuration?.connectionConfigured !== true || connectionChanged;
  const modelControlsDisabled = connectionPending || isDiscovering;
  const canSaveConfiguration = !modelControlsDisabled && modelId.trim().length > 0;

  const updateConnection = clientApi.assistant.updateConnection.useMutation({
    onSuccess: async ({ credentialsClearedForDestinationChange }) => {
      setApiKey("");
      setClearApiKey(false);
      setHeaders([]);
      setClearHeaders(false);
      await Promise.all([
        utils.assistant.getAdminConfiguration.invalidate(),
        utils.assistant.discoverModels.invalidate(),
        utils.assistant.getAvailability.invalidate(),
      ]);
      showSuccessNotification({
        title: t("notification.connectionSaved.title"),
        message: credentialsClearedForDestinationChange
          ? t("notification.connectionSaved.credentialsCleared")
          : t("notification.connectionSaved.message"),
      });
    },
    onError: (error) => showErrorNotification({ title: t("notification.error.title"), message: error.message }),
  });

  const saveConfiguration = clientApi.assistant.updateConfiguration.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.assistant.getAdminConfiguration.invalidate(),
        utils.assistant.getAvailability.invalidate(),
      ]);
      showSuccessNotification({
        title: t("notification.saved.title"),
        message: t("notification.saved.message"),
      });
    },
    onError: (error) => showErrorNotification({ title: t("notification.error.title"), message: error.message }),
  });

  const clearCredentials = clientApi.assistant.clearCredentials.useMutation({
    onSuccess: async () => {
      setApiKey("");
      setHeaders([]);
      setModelId("");
      setEnabled(false);
      await Promise.all([
        utils.assistant.getAdminConfiguration.invalidate(),
        utils.assistant.discoverModels.invalidate(),
        utils.assistant.getAvailability.invalidate(),
      ]);
      showSuccessNotification({
        title: t("notification.credentialsCleared.title"),
        message: t("notification.credentialsCleared.message"),
      });
    },
    onError: (error) => showErrorNotification({ title: t("notification.error.title"), message: error.message }),
  });

  const pending = isLoading || updateConnection.isPending || saveConfiguration.isPending || clearCredentials.isPending;

  const clearDraftConnectionState = () => {
    setApiKey("");
    setClearApiKey(false);
    setHeaders([]);
    setClearHeaders(false);
    setModelId("");
    setEnabled(false);
  };

  const changeProvider = (value: string | null) => {
    if (!value || !(value in assistantProviderPresets)) return;
    const nextProvider = value as AssistantProvider;
    const nextPreset = assistantProviderPresets[nextProvider];
    clearDraftConnectionState();
    setProvider(nextProvider);
    setBaseUrl(nextPreset.baseUrl);
    setModelDiscoveryPath(nextPreset.modelDiscoveryPath ?? "");
  };

  const changeBaseUrl = (value: string) => {
    if (value !== baseUrl) {
      clearDraftConnectionState();
    }
    setBaseUrl(value);
  };

  const changeModelDiscoveryPath = (value: string) => {
    if (value !== modelDiscoveryPath) {
      setModelId("");
      setEnabled(false);
    }
    setModelDiscoveryPath(value);
  };

  const changeApiKeyRemoval = (remove: boolean) => {
    if (remove) {
      setApiKey("");
    }
    setClearApiKey(remove);
  };

  const addHeader = () => {
    setHeaders((current) => [...current, { id: nextHeaderId, name: "", value: "" }]);
    setNextHeaderId((current) => current + 1);
    setClearHeaders(false);
  };

  const updateHeader = (id: number, field: "name" | "value", value: string) => {
    setHeaders((current) => current.map((header) => (header.id === id ? { ...header, [field]: value } : header)));
  };

  const saveConnection = () => {
    const customHeaders =
      headers.length > 0 ? Object.fromEntries(headers.map((header) => [header.name.trim(), header.value])) : undefined;
    updateConnection.mutate({
      provider,
      baseUrl,
      modelDiscoveryPath: modelDiscoveryPath.trim() || null,
      apiKey: apiKey.trim() || undefined,
      clearApiKey,
      customHeaders,
      clearCustomHeaders: clearHeaders,
    });
  };

  const saveAssistantConfiguration = () => {
    if (!canSaveConfiguration) return;
    saveConfiguration.mutate({ enabled, modelId: modelId.trim() });
  };

  return (
    <Stack>
      <Card pos="relative" withBorder>
        <LoadingOverlay visible={pending} />
        <Stack gap="lg">
          <Alert icon={<IconShieldLock size={18} />} color="blue" title={t("security.title")}>
            {t("security.description")}
          </Alert>

          <Group justify="space-between" align="flex-start">
            <div>
              <Text fw={600}>{t("connection.title")}</Text>
              <Text size="sm" c="dimmed">
                {t("connection.description")}
              </Text>
            </div>
            <Badge variant="light" color={configuration?.connectionConfigured ? "green" : "gray"}>
              {configuration?.connectionConfigured ? t("connection.saved") : t("connection.notSaved")}
            </Badge>
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Select
              label={t("provider.title")}
              description={t(`provider.options.${provider}.description`)}
              value={provider}
              onChange={changeProvider}
              data={providerOptions}
              searchable
              allowDeselect={false}
              leftSection={<ProviderIcon providerId={provider} />}
              renderOption={({ option }) => (
                <Group gap="sm" wrap="nowrap">
                  <ProviderIcon providerId={option.value as AssistantProvider} />
                  <Text size="sm">{option.label}</Text>
                </Group>
              )}
            />
            <TextInput
              label={t("baseUrl.title")}
              description={t("baseUrl.description")}
              leftSection={<IconWorld size={16} />}
              value={baseUrl}
              onChange={(event) => changeBaseUrl(event.currentTarget.value)}
              placeholder="https://provider.example/v1"
            />
          </SimpleGrid>
          <TextInput
            label={t("model.discoveryPath")}
            description={t("model.discoveryPathDescription")}
            value={modelDiscoveryPath}
            onChange={(event) => changeModelDiscoveryPath(event.currentTarget.value)}
            placeholder="/models"
          />

          {destinationChanged && (
            <Alert icon={<IconAlertTriangle size={18} />} color="yellow" title={t("destinationChanged.title")}>
              {t("destinationChanged.description")}
            </Alert>
          )}

          <Stack gap="xs">
            <Group justify="space-between" align="flex-end">
              <div>
                <Text fw={600}>{t("apiKey.title")}</Text>
                <Text size="sm" c="dimmed">
                  {preset.requiresApiKey ? t("apiKey.required") : t("apiKey.optional")}
                </Text>
              </div>
              {configuration?.apiKeyConfigured && (
                <Badge variant="light" color={clearApiKey ? "yellow" : "green"}>
                  {clearApiKey ? t("apiKey.pendingRemoval") : t("apiKey.configuredBadge")}
                </Badge>
              )}
            </Group>
            <PasswordInput
              aria-label={t("apiKey.title")}
              value={apiKey}
              onChange={(event) => {
                setApiKey(event.currentTarget.value);
                setClearApiKey(false);
              }}
              leftSection={<IconKey size={16} />}
              placeholder={
                configuration?.apiKeyConfigured ? t("apiKey.replacementPlaceholder") : t("apiKey.placeholder")
              }
              autoComplete="new-password"
            />
            {configuration?.apiKeyConfigured && (
              <Switch
                checked={clearApiKey}
                onChange={(event) => changeApiKeyRemoval(event.currentTarget.checked)}
                color="red"
                label={t("apiKey.remove")}
                description={clearApiKey ? t("apiKey.removalPendingDescription") : t("apiKey.removeDescription")}
              />
            )}
          </Stack>

          <Divider />

          <Stack gap="xs">
            <Group justify="space-between" align="flex-start">
              <div>
                <Text fw={600}>{t("headers.title")}</Text>
                <Text size="sm" c="dimmed">
                  {t("headers.description")}
                </Text>
              </div>
              <Button variant="subtle" size="compact-sm" leftSection={<IconPlus size={14} />} onClick={addHeader}>
                {t("headers.add")}
              </Button>
            </Group>
            {configuration?.customHeadersConfigured && headers.length === 0 && (
              <Alert color={clearHeaders ? "yellow" : "gray"}>{t("headers.configured")}</Alert>
            )}
            {headers.map((header) => (
              <Group key={header.id} align="flex-end" wrap="wrap">
                <TextInput
                  flex={1}
                  miw="12rem"
                  label={t("headers.name")}
                  value={header.name}
                  onChange={(event) => updateHeader(header.id, "name", event.currentTarget.value)}
                  placeholder="X-Provider-Header"
                />
                <PasswordInput
                  flex={2}
                  miw="12rem"
                  label={t("headers.value")}
                  value={header.value}
                  onChange={(event) => updateHeader(header.id, "value", event.currentTarget.value)}
                  placeholder={t("headers.valuePlaceholder")}
                  autoComplete="off"
                />
                <Tooltip label={t("headers.remove")}>
                  <ActionIcon
                    size="lg"
                    variant="subtle"
                    color="red"
                    aria-label={t("headers.remove")}
                    onClick={() => setHeaders((current) => current.filter((item) => item.id !== header.id))}
                  >
                    <IconTrash size={17} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            ))}
            {configuration?.customHeadersConfigured && headers.length === 0 && (
              <Button
                variant="subtle"
                color={clearHeaders ? "gray" : "red"}
                onClick={() => setClearHeaders(!clearHeaders)}
              >
                {clearHeaders ? t("headers.keep") : t("headers.clear")}
              </Button>
            )}
          </Stack>

          <Group justify="space-between">
            <Button onClick={saveConnection} disabled={!connectionValid}>
              {t("connection.save")}
            </Button>
            {(configuration?.apiKeyConfigured || configuration?.customHeadersConfigured) && (
              <Button variant="subtle" color="red" onClick={() => clearCredentials.mutate()}>
                {t("connection.clearCredentials")}
              </Button>
            )}
          </Group>

          <Divider />

          <Stack gap="xs">
            <Group justify="space-between" align="flex-start">
              <div>
                <Text fw={600}>{t("model.title")}</Text>
                <Text size="sm" c="dimmed">
                  {t("model.description")}
                </Text>
              </div>
              <Button
                variant="subtle"
                size="compact-sm"
                leftSection={<IconDatabaseSearch size={14} />}
                loading={isDiscovering}
                disabled={modelControlsDisabled || configuration?.modelDiscoveryPath === null}
                onClick={() => void discoverModels()}
              >
                {t("model.refresh")}
              </Button>
            </Group>
            {hasDiscoveredModels ? (
              <Select
                aria-label={t("model.title")}
                value={modelId || null}
                onChange={(value) => setModelId(value ?? "")}
                data={modelControlsDisabled ? [] : modelOptions}
                disabled={modelControlsDisabled}
                placeholder={t("model.placeholder")}
                description={t("model.discovered", { count: models?.length ?? 0 })}
                searchable
                allowDeselect={false}
                limit={100}
              />
            ) : (
              <TextInput
                aria-label={t("model.title")}
                value={modelId}
                onChange={(event) => setModelId(event.currentTarget.value)}
                disabled={modelControlsDisabled}
                placeholder={t("model.placeholder")}
                description={
                  connectionPending
                    ? t("model.saveConnectionFirst")
                    : isDiscovering
                      ? t("model.discovering")
                      : discoveryError || models?.length === 0
                        ? t("model.manualFallback")
                        : t("model.manual")
                }
              />
            )}
            {discoveryError && !connectionPending && (
              <Alert color="yellow" icon={<IconAlertTriangle size={18} />} title={t("model.discoveryFailed")}>
                {discoveryError.message}
              </Alert>
            )}
            {selectedModel && (
              <Card withBorder padding="sm" radius="md">
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <div>
                    <Text fw={600}>{selectedModel.name}</Text>
                    {selectedModel.description && (
                      <Text size="sm" c="dimmed" lineClamp={2}>
                        {selectedModel.description}
                      </Text>
                    )}
                  </div>
                  <Group gap="xs" justify="flex-end">
                    {selectedModel.contextLength && (
                      <Badge variant="light">
                        {t("model.context", { count: selectedModel.contextLength.toLocaleString() })}
                      </Badge>
                    )}
                    <Badge
                      variant="light"
                      color={selectedModel.toolSupport === "confirmed" ? "green" : "gray"}
                      leftSection={<IconTool size={12} />}
                    >
                      {selectedModel.toolSupport === "confirmed" ? t("model.toolsConfirmed") : t("model.toolsUnknown")}
                    </Badge>
                  </Group>
                </Group>
              </Card>
            )}
          </Stack>

          <Switch
            checked={enabled}
            onChange={(event) => setEnabled(event.currentTarget.checked)}
            disabled={!canSaveConfiguration}
            label={t("enabled.label")}
            description={t("enabled.description")}
          />

          <Group justify="flex-end">
            <Button onClick={saveAssistantConfiguration} disabled={!canSaveConfiguration}>
              {t("save")}
            </Button>
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
};
