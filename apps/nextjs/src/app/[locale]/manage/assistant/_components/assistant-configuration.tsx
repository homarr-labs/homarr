"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Accordion,
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Image,
  LoadingOverlay,
  Paper,
  PasswordInput,
  Select,
  Skeleton,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconBrandGithub,
  IconCheck,
  IconCircleCheck,
  IconDatabaseSearch,
  IconKey,
  IconPlus,
  IconSearch,
  IconShieldCheck,
  IconShieldLock,
  IconTool,
  IconTrash,
  IconWorld,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import {
  assistantProviderCanUseOpenRouterServerTools,
  assistantProviderIds,
  assistantProviderPresets,
  getAssistantModelOptionLabel,
  resolveAssistantModelId,
} from "@homarr/definitions";
import type { AssistantProvider, AssistantProviderCategory } from "@homarr/definitions";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import { getWorkshopAssistantProviderUrl } from "~/components/workshop/workshop-client";

import classes from "./assistant-configuration.module.css";
import { formatAssistantContextWindow, getAssistantConnectionState } from "./assistant-configuration-state";

type HeaderEntry = { id: number; name: string; value: string };
type CredentialFlow = "idle" | "remove";
const ProviderIcon = ({ providerId, size = 20 }: { providerId: AssistantProvider; size?: number }) => {
  if (providerId === "homarr") {
    return <Image src="/logo/logo.png" alt="" aria-hidden w={size} h={size} fit="contain" />;
  }

  const preset = assistantProviderPresets[providerId];
  if (!preset.iconUrl) return <IconWorld size={size} aria-hidden />;

  const darkIconUrl = "darkIconUrl" in preset ? preset.darkIconUrl : null;
  if (!darkIconUrl) {
    return <Image src={preset.iconUrl} alt="" aria-hidden w={size} h={size} fit="contain" />;
  }

  return (
    <>
      <Image src={preset.iconUrl} alt="" aria-hidden w={size} h={size} fit="contain" darkHidden />
      <Image src={darkIconUrl} alt="" aria-hidden w={size} h={size} fit="contain" lightHidden />
    </>
  );
};

interface ConfigurationSectionProps {
  number: number;
  title: string;
  description: string;
  status?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

const ConfigurationSection = ({ number, title, description, status, actions, children }: ConfigurationSectionProps) => (
  <section className={classes.section}>
    <Group className={classes.sectionHeader} justify="space-between" align="flex-start">
      <Group className={classes.sectionHeading} gap="sm" align="flex-start" wrap="nowrap">
        <Box className={classes.stepNumber} aria-hidden>
          {number}
        </Box>
        <Box>
          <Text fw={650}>{title}</Text>
          <Text size="sm" c="dimmed" maw="66ch">
            {description}
          </Text>
        </Box>
      </Group>
      {status}
    </Group>
    <Stack className={classes.sectionBody} gap="md">
      {children}
    </Stack>
    {actions && <Box className={classes.sectionActions}>{actions}</Box>}
  </section>
);

const ConfigurationSkeleton = ({ label }: { label: string }) => (
  <Stack className={classes.configuration} gap="md" aria-label={label}>
    <Paper withBorder p="md">
      <Group justify="space-between">
        <Group>
          <Skeleton circle h={36} />
          <Stack gap={5}>
            <Skeleton h={14} w={180} />
            <Skeleton h={10} w={280} />
          </Stack>
        </Group>
        <Skeleton h={24} w={110} radius="xl" />
      </Group>
    </Paper>
    {[1, 2, 3].map((number) => (
      <Paper key={number} withBorder p="md">
        <Stack gap="sm">
          <Skeleton h={18} w={220} />
          <Skeleton h={12} w="65%" />
          <Skeleton h={42} />
        </Stack>
      </Paper>
    ))}
  </Stack>
);

export const AssistantConfiguration = () => {
  const t = useI18n("management.page.settings.section.assistant");
  const tCommon = useI18n("common");
  const router = useRouter();
  const utils = clientApi.useUtils();
  const { data: configuration, isLoading } = clientApi.assistant.getAdminConfiguration.useQuery();
  const [provider, setProvider] = useState<AssistantProvider>("homarr");
  const [baseUrl, setBaseUrl] = useState<string>(assistantProviderPresets.homarr.baseUrl);
  const [modelDiscoveryPath, setModelDiscoveryPath] = useState<string>("/models");
  const [apiKey, setApiKey] = useState("");
  const [credentialFlow, setCredentialFlow] = useState<CredentialFlow>("idle");
  const [headers, setHeaders] = useState<HeaderEntry[]>([]);
  const [clearHeaders, setClearHeaders] = useState(false);
  const [nextHeaderId, setNextHeaderId] = useState(1);
  const [modelId, setModelId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  useEffect(() => {
    const configuredProvider = configuration?.provider ?? "homarr";
    setProvider(configuredProvider);
    setBaseUrl(
      configuredProvider === "homarr"
        ? getWorkshopAssistantProviderUrl()
        : (configuration?.baseUrl ?? assistantProviderPresets.openrouter.baseUrl),
    );
    setModelDiscoveryPath(configuration?.modelDiscoveryPath ?? "");
    setModelId(configuration?.modelId ?? "");
    setEnabled(configuration?.enabled ?? false);
    setWebSearchEnabled(configuration?.webSearchEnabled ?? false);
    setApiKey("");
    setCredentialFlow("idle");
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
      (["free", "hosted", "local", "custom"] satisfies AssistantProviderCategory[]).map((category) => {
        const items = assistantProviderIds
          .filter((providerId) => assistantProviderPresets[providerId].category === category)
          .map((providerId) => ({
            value: providerId,
            label: assistantProviderPresets[providerId].label ?? t("provider.options.custom.label"),
          }));

        return { group: t(`provider.groups.${category}`), items };
      }),
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
  const isHomarrProvider = provider === "homarr";
  const headerValuesValid = headers.every((header) => header.name.trim().length > 0 && header.value.length > 0);
  const { hasStoredApiKey, connectionPending, connectionReady } = getAssistantConnectionState({
    connectionConfigured: configuration?.connectionConfigured === true,
    destinationChanged,
    providerRequiresApiKey: preset.requiresApiKey,
    apiKeyConfigured: configuration?.apiKeyConfigured === true,
  });
  const hasEffectiveApiKey = apiKey.trim().length > 0 || hasStoredApiKey;
  const connectionValid =
    baseUrl.trim().length > 0 && headerValuesValid && (!preset.requiresApiKey || hasEffectiveApiKey);
  const modelControlsDisabled = connectionPending || isDiscovering;
  const canSaveConfiguration = !modelControlsDisabled && modelId.trim().length > 0;
  const canUseOpenRouterServerTools = assistantProviderCanUseOpenRouterServerTools(provider);

  const updateConnection = clientApi.assistant.updateConnection.useMutation({
    onSuccess: async ({ credentialsClearedForDestinationChange }) => {
      setApiKey("");
      setCredentialFlow("idle");
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
        utils.assistant.getRuntimeOptions.invalidate(),
      ]);
      router.refresh();
      showSuccessNotification({
        title: t("notification.saved.title"),
        message: t("notification.saved.message"),
      });
    },
    onError: (error) => showErrorNotification({ title: t("notification.error.title"), message: error.message }),
  });

  const pending = updateConnection.isPending || saveConfiguration.isPending;

  const resetCredentialFlow = () => {
    setApiKey("");
    setCredentialFlow("idle");
  };

  const clearDraftConnectionState = () => {
    resetCredentialFlow();
    setHeaders([]);
    setClearHeaders(false);
    setModelId("");
    setEnabled(false);
    setWebSearchEnabled(false);
  };

  const changeProvider = (value: string | null) => {
    if (!value || !(value in assistantProviderPresets)) return;
    const nextProvider = value as AssistantProvider;
    const nextPreset = assistantProviderPresets[nextProvider];
    clearDraftConnectionState();
    setProvider(nextProvider);
    setBaseUrl(nextProvider === "homarr" ? getWorkshopAssistantProviderUrl() : nextPreset.baseUrl);
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

  const addHeader = () => {
    setHeaders((current) => [...current, { id: nextHeaderId, name: "", value: "" }]);
    setNextHeaderId((current) => current + 1);
    setClearHeaders(false);
  };

  const updateHeader = (id: number, field: "name" | "value", value: string) => {
    setHeaders((current) => current.map((header) => (header.id === id ? { ...header, [field]: value } : header)));
  };

  const saveConnection = (clearApiKey = false) => {
    const customHeaders = isHomarrProvider
      ? undefined
      : headers.length > 0
        ? Object.fromEntries(headers.map((header) => [header.name.trim(), header.value]))
        : undefined;
    updateConnection.mutate({
      provider,
      baseUrl,
      modelDiscoveryPath: modelDiscoveryPath.trim() || null,
      apiKey: clearApiKey || isHomarrProvider ? undefined : apiKey.trim() || undefined,
      clearApiKey: clearApiKey || isHomarrProvider,
      customHeaders,
      clearCustomHeaders: clearHeaders || isHomarrProvider,
    });
  };

  const saveAssistantConfiguration = () => {
    if (!canSaveConfiguration) return;
    saveConfiguration.mutate({
      enabled,
      modelId: modelId.trim(),
      webSearchEnabled: canUseOpenRouterServerTools && webSearchEnabled,
    });
  };

  if (isLoading) {
    return <ConfigurationSkeleton label={t("loading")} />;
  }

  return (
    <>
      <Stack className={classes.configuration} gap="md">
        <Paper className={classes.summary} withBorder p="md" radius="md" pos="relative">
          <LoadingOverlay visible={pending} />
          <Group justify="space-between" align="center">
            <Group className={classes.summaryProvider} gap="sm" wrap="nowrap">
              <ThemeIcon variant="default" size="lg" radius="md">
                <ProviderIcon providerId={provider} size={22} />
              </ThemeIcon>
              <Box className={classes.summaryProviderText}>
                <Group gap="xs">
                  <Text fw={650}>{assistantProviderPresets[provider].label ?? t("provider.options.custom.label")}</Text>
                  <Badge
                    size="sm"
                    variant="light"
                    color={connectionChanged ? "yellow" : connectionReady ? "green" : "gray"}
                  >
                    {connectionChanged
                      ? t("overview.unsavedChanges")
                      : connectionReady
                        ? t("overview.connectionReady")
                        : t("overview.setupRequired")}
                  </Badge>
                </Group>
                <Text className={classes.summaryEndpoint} size="sm" c="dimmed" truncate>
                  {configuration?.modelId ?? t("overview.noModel")} · {normalizedBaseUrl}
                </Text>
              </Box>
            </Group>
            <Group className={classes.summaryActions} gap="xs">
              {configuration?.webSearchEnabled && (
                <Badge variant="light" leftSection={<IconSearch size={12} />}>
                  {t("serverTools.webSearch.label")}
                </Badge>
              )}
              {configuration?.enabled === false && (
                <Badge variant="filled" color="gray">
                  {t("overview.disabled")}
                </Badge>
              )}
            </Group>
          </Group>
        </Paper>

        <Group gap="xs" align="flex-start" wrap="nowrap">
          <IconShieldCheck size={18} color="var(--mantine-color-blue-6)" aria-hidden />
          <Text className={classes.securityNote} size="sm" c="dimmed">
            {t("security.description")}
          </Text>
        </Group>

        <ConfigurationSection
          number={1}
          title={t("connection.endpointTitle")}
          description={t("connection.description")}
          status={
            <Badge variant="light" color={connectionChanged ? "yellow" : "gray"}>
              {assistantProviderPresets[provider].label ?? t("provider.options.custom.label")}
            </Badge>
          }
        >
          <Stack gap="md">
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
                <Group gap="sm" wrap="nowrap" align="center" w="100%">
                  <ProviderIcon providerId={option.value as AssistantProvider} />
                  <Box flex={1} miw={0}>
                    <Group gap="xs" wrap="nowrap" justify="space-between">
                      <Text size="sm" truncate>
                        {option.label}
                      </Text>
                    </Group>
                    {option.value === "homarr" && (
                      <Text size="xs" c="dimmed" lineClamp={2}>
                        {t("provider.options.homarr.description")}
                      </Text>
                    )}
                  </Box>
                </Group>
              )}
            />
            <TextInput
              label={t("baseUrl.title")}
              description={t("baseUrl.description")}
              leftSection={<IconWorld size={16} />}
              value={baseUrl}
              disabled={isHomarrProvider}
              onChange={(event) => changeBaseUrl(event.currentTarget.value)}
              placeholder="https://provider.example/v1"
            />
            <TextInput
              label={t("model.discoveryPath")}
              description={t("model.discoveryPathDescription")}
              value={modelDiscoveryPath}
              disabled={isHomarrProvider}
              onChange={(event) => changeModelDiscoveryPath(event.currentTarget.value)}
              placeholder="/models"
            />
          </Stack>
        </ConfigurationSection>

        <ConfigurationSection
          number={2}
          title={t("credentials.title")}
          description={t("credentials.description")}
          status={
            isHomarrProvider ? (
              <Badge variant="light" color="blue">
                {t("credentials.workshop")}
              </Badge>
            ) : hasStoredApiKey ? undefined : (
              <Badge variant="light" color={preset.requiresApiKey ? "yellow" : "gray"}>
                {preset.requiresApiKey ? t("credentials.required") : t("credentials.optional")}
              </Badge>
            )
          }
          actions={
            <Group justify="flex-end">
              {credentialFlow === "idle" && (
                <Button
                  leftSection={<IconCheck size={16} />}
                  onClick={() => saveConnection()}
                  disabled={!connectionValid}
                  loading={updateConnection.isPending}
                >
                  {t("connection.save")}
                </Button>
              )}
            </Group>
          }
        >
          {isHomarrProvider ? (
            <Alert color="blue" icon={<IconBrandGithub size={18} />} title={t("provider.homarrAuth.title")}>
              {t("provider.homarrAuth.description")}
            </Alert>
          ) : hasStoredApiKey && credentialFlow === "idle" ? (
            <Group className={classes.credentialSummary} justify="space-between" align="center">
              <Group className={classes.credentialSummaryContent} gap="sm" wrap="nowrap">
                <ThemeIcon color="teal" variant="light" radius="xl">
                  <IconShieldLock size={18} />
                </ThemeIcon>
                <Box>
                  <Text fw={600} size="sm">
                    {t("apiKey.savedTitle")}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {t("apiKey.savedDescription")}
                  </Text>
                </Box>
              </Group>
              <Group className={classes.credentialActions} gap="xs">
                <Button variant="subtle" color="red" onClick={() => setCredentialFlow("remove")}>
                  {t("apiKey.remove")}
                </Button>
              </Group>
            </Group>
          ) : credentialFlow === "remove" ? (
            <Alert color="red" icon={<IconAlertTriangle size={18} />} title={t("apiKey.removeFlow.title")}>
              <Stack gap="md">
                <Text size="sm">
                  {preset.requiresApiKey
                    ? t("apiKey.removeFlow.description")
                    : t("apiKey.removeFlow.optionalDescription")}
                </Text>
                <Box className={classes.flowActions}>
                  <Button variant="default" onClick={resetCredentialFlow}>
                    {t("apiKey.removeFlow.cancel")}
                  </Button>
                  <Button color="red" loading={updateConnection.isPending} onClick={() => saveConnection(true)}>
                    {t("apiKey.removeFlow.confirm")}
                  </Button>
                </Box>
              </Stack>
            </Alert>
          ) : (
            <PasswordInput
              label={t("apiKey.title")}
              description={preset.requiresApiKey ? t("apiKey.required") : t("apiKey.optional")}
              value={apiKey}
              onChange={(event) => setApiKey(event.currentTarget.value)}
              leftSection={<IconKey size={16} />}
              placeholder={t("apiKey.placeholder")}
              autoComplete="new-password"
            />
          )}

          {!isHomarrProvider && (
            <Accordion variant="contained" radius="md">
              <Accordion.Item value="headers">
                <Accordion.Control className={classes.advancedControl} icon={<IconShieldLock size={18} />}>
                  <Group justify="space-between" wrap="nowrap">
                    <Box>
                      <Text size="sm" fw={600}>
                        {t("headers.title")}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {t("headers.description")}
                      </Text>
                    </Box>
                    {configuration?.customHeadersConfigured && (
                      <Badge variant="light" color={clearHeaders ? "yellow" : "green"}>
                        {clearHeaders ? t("headers.pendingRemoval") : t("headers.savedBadge")}
                      </Badge>
                    )}
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="sm">
                    <Group justify="space-between" align="center">
                      <Text size="sm" c="dimmed">
                        {configuration?.customHeadersConfigured ? t("headers.configured") : t("headers.empty")}
                      </Text>
                      <Button
                        variant="light"
                        size="compact-sm"
                        leftSection={<IconPlus size={14} />}
                        onClick={addHeader}
                      >
                        {t("headers.add")}
                      </Button>
                    </Group>
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
                        variant="light"
                        color={clearHeaders ? "gray" : "red"}
                        onClick={() => setClearHeaders(!clearHeaders)}
                      >
                        {clearHeaders ? t("headers.keep") : t("headers.clear")}
                      </Button>
                    )}
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          )}
        </ConfigurationSection>

        <ConfigurationSection
          number={3}
          title={t("model.title")}
          description={t("model.description")}
          status={
            !configuration?.modelId ? (
              <Badge variant="light" color="gray">
                {t("overview.noModel")}
              </Badge>
            ) : configuration.enabled ? undefined : (
              <Badge variant="light" color="gray">
                {t("overview.disabled")}
              </Badge>
            )
          }
          actions={
            <Group justify="flex-end">
              <Button
                leftSection={<IconCircleCheck size={16} />}
                onClick={saveAssistantConfiguration}
                disabled={!canSaveConfiguration}
                loading={saveConfiguration.isPending}
              >
                {t("save")}
              </Button>
            </Group>
          }
        >
          <Group justify="space-between" align="center">
            <Text size="sm" c="dimmed">
              {connectionPending ? t("model.saveConnectionFirst") : t("model.chooseModel")}
            </Text>
            <Button
              variant="light"
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
              label={t("model.title")}
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
              label={t("model.title")}
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
            <Group className={classes.selectedModel} justify="space-between" align="flex-start" wrap="nowrap">
              <Box className={classes.selectedModelText}>
                <Text fw={600}>{selectedModel.name}</Text>
                {selectedModel.description && (
                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {selectedModel.description}
                  </Text>
                )}
              </Box>
              <Group className={classes.selectedModelBadges} gap="xs" justify="flex-end">
                {selectedModel.contextLength && (
                  <Badge variant="light">
                    {t("model.context", { count: formatAssistantContextWindow(selectedModel.contextLength) })}
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
          )}

          {canUseOpenRouterServerTools && (
            <Stack gap="xs">
              <Divider label={t("serverTools.title")} labelPosition="left" />
              <Group className={classes.capabilityRow} justify="space-between" align="center" wrap="nowrap">
                <Group gap="sm" align="flex-start" wrap="nowrap">
                  <ThemeIcon variant="light" radius="xl" size="md">
                    <IconSearch size={17} />
                  </ThemeIcon>
                  <Box>
                    <Group gap="xs">
                      <Text size="sm" fw={600}>
                        {t("serverTools.webSearch.label")}
                      </Text>
                      <Badge size="xs" variant="light">
                        {tCommon("beta")}
                      </Badge>
                    </Group>
                    <Text size="sm" c="dimmed" maw="66ch">
                      {provider === "custom"
                        ? t("serverTools.webSearch.proxyDescription")
                        : t("serverTools.webSearch.description")}
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      {t("serverTools.webSearch.limit")}
                    </Text>
                  </Box>
                </Group>
                <Switch
                  checked={webSearchEnabled}
                  onChange={(event) => setWebSearchEnabled(event.currentTarget.checked)}
                  disabled={modelControlsDisabled}
                  aria-label={t("serverTools.webSearch.label")}
                  size="md"
                />
              </Group>
            </Stack>
          )}

          <Group className={classes.enableRow} justify="space-between" align="center" wrap="nowrap">
            <Box>
              <Text size="sm" fw={600}>
                {t("enabled.label")}
              </Text>
              <Text size="sm" c="dimmed">
                {t("enabled.description")}
              </Text>
            </Box>
            <Switch
              checked={enabled}
              onChange={(event) => setEnabled(event.currentTarget.checked)}
              disabled={!canSaveConfiguration}
              aria-label={t("enabled.label")}
              size="md"
            />
          </Group>
        </ConfigurationSection>
      </Stack>
    </>
  );
};
