"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Autocomplete,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  LoadingOverlay,
  PasswordInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconDatabaseSearch,
  IconKey,
  IconPlus,
  IconRobot,
  IconShieldLock,
  IconTrash,
  IconWorld,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

const providerPresets = {
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    discoveryPath: "/models",
    requiresApiKey: true,
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    discoveryPath: "/models",
    requiresApiKey: true,
  },
  ollama: {
    baseUrl: "http://localhost:11434/v1",
    discoveryPath: "/models",
    requiresApiKey: false,
  },
  "lm-studio": {
    baseUrl: "http://localhost:1234/v1",
    discoveryPath: "/models",
    requiresApiKey: false,
  },
  custom: {
    baseUrl: "",
    discoveryPath: "/models",
    requiresApiKey: false,
  },
} as const;

type Provider = keyof typeof providerPresets;
type HeaderEntry = { id: number; name: string; value: string };

export const AssistantSettings = () => {
  const t = useScopedI18n("management.page.settings.section.assistant");
  const utils = clientApi.useUtils();
  const { data: configuration, isLoading } = clientApi.assistant.getAdminConfiguration.useQuery();
  const [provider, setProvider] = useState<Provider>("openrouter");
  const [baseUrl, setBaseUrl] = useState<string>(providerPresets.openrouter.baseUrl);
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
    setBaseUrl(configuration?.baseUrl ?? providerPresets.openrouter.baseUrl);
    setModelDiscoveryPath(configuration?.modelDiscoveryPath ?? "");
    setModelId(configuration?.modelId ?? "");
    setEnabled(configuration?.enabled ?? false);
  }, [configuration]);

  const {
    data: models,
    error: discoveryError,
    isFetching: isDiscovering,
    refetch: discoverModels,
  } = clientApi.assistant.discoverModels.useQuery(undefined, {
    enabled: configuration?.connectionConfigured === true && configuration.modelDiscoveryPath !== null,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const modelOptions = useMemo(
    () =>
      (models ?? []).map((model) => ({
        value: model.id,
        label: model.name === model.id ? model.id : `${model.name} (${model.id})`,
      })),
    [models],
  );

  const destinationChanged =
    configuration?.connectionConfigured === true &&
    (configuration.provider !== provider || configuration.baseUrl !== baseUrl.trim().replace(/\/$/, ""));
  const preset = providerPresets[provider];
  const headerValuesValid = headers.every((header) => header.name.trim().length > 0 && header.value.length > 0);
  const hasEffectiveApiKey =
    apiKey.trim().length > 0 || (!destinationChanged && configuration?.apiKeyConfigured === true && !clearApiKey);
  const connectionValid =
    baseUrl.trim().length > 0 && headerValuesValid && (!preset.requiresApiKey || hasEffectiveApiKey);

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

  const changeProvider = (value: string | null) => {
    if (!value || !(value in providerPresets)) return;
    const nextProvider = value as Provider;
    const nextPreset = providerPresets[nextProvider];
    setProvider(nextProvider);
    setBaseUrl(nextPreset.baseUrl);
    setModelDiscoveryPath(nextPreset.discoveryPath);
    setEnabled(false);
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

  return (
    <Stack>
      <Group gap="sm">
        <IconRobot size={26} />
        <Title order={2}>{t("title")}</Title>
      </Group>
      <Text c="dimmed">{t("description")}</Text>

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
              data={Object.keys(providerPresets).map((value) => ({
                value,
                label: t(`provider.options.${value as Provider}.label`),
              }))}
            />
            <TextInput
              label={t("baseUrl.title")}
              description={t("baseUrl.description")}
              leftSection={<IconWorld size={16} />}
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.currentTarget.value)}
              placeholder="https://provider.example/v1"
            />
          </SimpleGrid>
          <TextInput
            label={t("model.discoveryPath")}
            description={t("model.discoveryPathDescription")}
            value={modelDiscoveryPath}
            onChange={(event) => setModelDiscoveryPath(event.currentTarget.value)}
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
              value={apiKey}
              onChange={(event) => {
                setApiKey(event.currentTarget.value);
                setClearApiKey(false);
              }}
              leftSection={<IconKey size={16} />}
              placeholder={configuration?.apiKeyConfigured ? t("apiKey.configured") : t("apiKey.placeholder")}
              autoComplete="new-password"
            />
            {configuration?.apiKeyConfigured && (
              <Button
                variant="subtle"
                color={clearApiKey ? "gray" : "red"}
                onClick={() => setClearApiKey(!clearApiKey)}
              >
                {clearApiKey ? t("apiKey.keep") : t("apiKey.clear")}
              </Button>
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
                disabled={!configuration?.connectionConfigured || configuration.modelDiscoveryPath === null}
                onClick={() => void discoverModels()}
              >
                {t("model.refresh")}
              </Button>
            </Group>
            <Autocomplete
              value={modelId}
              onChange={setModelId}
              data={modelOptions}
              placeholder={t("model.placeholder")}
              description={
                discoveryError
                  ? t("model.manualFallback")
                  : models
                    ? t("model.discovered", { count: models.length })
                    : t("model.manual")
              }
              limit={100}
            />
          </Stack>

          <Switch
            checked={enabled}
            onChange={(event) => setEnabled(event.currentTarget.checked)}
            disabled={!configuration?.connectionConfigured || modelId.trim().length === 0}
            label={t("enabled.label")}
            description={t("enabled.description")}
          />

          <Group justify="flex-end">
            <Button
              onClick={() => saveConfiguration.mutate({ enabled, modelId: modelId.trim() })}
              disabled={!configuration?.connectionConfigured || modelId.trim().length === 0}
            >
              {t("save")}
            </Button>
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
};
