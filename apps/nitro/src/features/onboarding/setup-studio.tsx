import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import {
  Alert,
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Checkbox,
  Code,
  CopyButton,
  ColorSwatch,
  Fieldset,
  Group,
  Paper,
  Popover,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Timeline,
  Title,
  UnstyledButton,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconAdjustments,
  IconApps,
  IconArrowLeft,
  IconArrowRight,
  IconBorderRadius,
  IconBrandDocker,
  IconCheck,
  IconCode,
  IconCopy,
  IconDeviceMobile,
  IconDatabase,
  IconExternalLink,
  IconLanguage,
  IconLayoutColumns,
  IconLayoutDashboard,
  IconLayoutSidebar,
  IconPalette,
  IconPlugConnected,
  IconRefresh,
  IconRobot,
  IconSearch,
  IconServer,
  IconSparkles,
  IconSunMoon,
} from "@tabler/icons-react";

import { IntegrationConnections } from "./connections";
import type { EditableIntegration } from "./connections";
import { isOnboardingAuthorityError, onboardingError } from "./errors";
import { useOnboardingRead } from "./native-read";
import type {
  ColorScheme,
  CornerStyle,
  Discovery,
  OnboardingClient,
  OnboardingProps,
  Translate,
  UrlTemplateMode,
} from "./types";

const sections = ["essentials", "discover", "connect", "board", "extend", "review"] as const;
const sectionIcons = {
  essentials: IconAdjustments,
  discover: IconSearch,
  connect: IconPlugConnected,
  board: IconLayoutDashboard,
  extend: IconSparkles,
  review: IconCheck,
};
type Section = (typeof sections)[number];

type SetupStudioProps<Kind extends string, Secret extends string, Locale extends string> = Pick<
  OnboardingProps<Kind, Secret, Locale>,
  "environment" | "source" | "currentLocale" | "assistantConfiguration"
> & {
  client: OnboardingClient<Kind, Secret> | null;
  onAuthorityFailure?(): void;
  displayLabel?: string;
};

export type OnboardingSetupPreviewProps<Kind extends string, Secret extends string, Locale extends string> = Pick<
  OnboardingProps<Kind, Secret, Locale>,
  "environment" | "source" | "currentLocale"
> & { displayLabel: string };

export function OnboardingSetupPreview<Kind extends string, Secret extends string, Locale extends string>(
  props: OnboardingSetupPreviewProps<Kind, Secret, Locale>,
) {
  return <SetupStudio {...props} client={null} />;
}

export function SetupStudio<Kind extends string, Secret extends string, Locale extends string>(
  props: SetupStudioProps<Kind, Secret, Locale>,
) {
  const { environment, client, source, onAuthorityFailure } = props;
  const t = source.t;
  const classes = source.presentation.classes;
  const Backdrop = source.presentation.Backdrop;
  const Link = source.presentation.Link;
  const IntegrationAvatar = source.IntegrationAvatar;
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [section, setSection] = useState<Section>("essentials");
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [selectedLocale, setSelectedLocale] = useState(props.currentLocale);
  const [serverOrigin, setServerOrigin] = useState(environment.serverOrigin);
  const [urlMode, setUrlMode] = useState<UrlTemplateMode>("hostPort");
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [selectedKinds, setSelectedKinds] = useState<Kind[]>([]);
  const [integrationIds, setIntegrationIds] = useState<string[]>([]);
  const [appIds, setAppIds] = useState<string[]>([]);
  const [appOverrides, setAppOverrides] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<EditableIntegration<Kind, Secret>[]>([]);
  const [knownDiscovery, setKnownDiscovery] = useState<Discovery<Kind> | null>(null);
  const initialBoard =
    environment.initialBoard ?? (environment.availableBoards.length === 1 ? environment.availableBoards[0] : null);
  const [boardId, setBoardId] = useState<string | null>(initialBoard?.id ?? null);
  const [boardName, setBoardName] = useState(initialBoard?.name ?? "dashboard");
  const [primaryColor, setPrimaryColor] = useState("#fa5252");
  const [secondaryColor, setSecondaryColor] = useState("#fd7e14");
  const style: CSSProperties & Record<"--studio-glow-color" | "--studio-secondary-glow-color", string> = {
    "--studio-glow-color": primaryColor,
    "--studio-secondary-glow-color": secondaryColor,
  };
  const [itemRadius, setItemRadius] = useState<CornerStyle>("lg");
  const [columnCount, setColumnCount] = useState(10);
  const [leftSidebar, setLeftSidebar] = useState(false);
  const [rightSidebar, setRightSidebar] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [incompleteConfirmation, setIncompleteConfirmation] = useState(false);
  const [appErrorId, setAppErrorId] = useState<string | null>(null);
  const seenIntegrations = useRef(new Set<string>());
  const seenApps = useRef(new Set<string>());
  const heading = useRef<HTMLHeadingElement>(null);
  const navigation = useRef<(HTMLButtonElement | null)[]>([]);
  const previousSection = useRef(section);
  const focusHeading = useRef(true);
  const readDiscovery = useCallback(
    (signal: AbortSignal) => {
      if (!client) return Promise.reject(new Error(source.holds.authority));
      return client.onboard.discoverDockerServices(undefined, { signal });
    },
    [client, source.holds.authority],
  );
  const readCapabilities = useCallback(
    (signal: AbortSignal) => {
      if (!client) return Promise.reject(new Error(source.holds.authority));
      return client.onboard.detectRuntimeCapabilities(undefined, { signal });
    },
    [client, source.holds.authority],
  );
  const discovery = useOnboardingRead(readDiscovery, client !== null && environment.dockerConfigured);
  const capabilities = useOnboardingRead(readCapabilities, client !== null);

  useEffect(() => {
    const error =
      discovery.state.kind === "error"
        ? discovery.state.error
        : capabilities.state.kind === "error"
          ? capabilities.state.error
          : null;
    if (isOnboardingAuthorityError(error)) onAuthorityFailure?.();
  }, [discovery.state, capabilities.state, onAuthorityFailure]);

  useEffect(() => {
    if (discovery.state.kind !== "ready") return;
    const data = discovery.state.data;
    setKnownDiscovery(data);
    const newIntegrations = source.takeNewSourceIds(
      data.integrations.map((entry) => entry.sourceId),
      seenIntegrations.current,
    );
    const newApps = source.takeNewSourceIds(
      data.apps.map((entry) => entry.sourceId),
      seenApps.current,
    );
    if (newIntegrations.length > 0) setIntegrationIds((current) => [...new Set([...current, ...newIntegrations])]);
    if (newApps.length > 0) setAppIds((current) => [...new Set([...current, ...newApps])]);
  }, [discovery.state, source]);

  useEffect(() => {
    setDrafts((current) => {
      const existing = new Map(current.map((draft) => [draft.sourceId, draft]));
      const next: EditableIntegration<Kind, Secret>[] = [];
      const add = (input: {
        sourceId: string;
        kind: Kind;
        name: string;
        fallback: string | null;
        port?: number;
        source: "manual" | "docker";
      }) => {
        const old = existing.get(input.sourceId);
        const url = source.resolveIntegrationDraftUrl({
          currentUrl: old?.url ?? "",
          overridden: old?.urlOverridden ?? false,
          serverUrl: serverOrigin ? source.buildIntegrationUrl(input.kind, serverOrigin, urlMode, input.port) : null,
          fallbackUrl: input.fallback,
        });
        next.push(
          old
            ? { ...old, url }
            : {
                sourceId: input.sourceId,
                kind: input.kind,
                name: input.name,
                url,
                source: input.source,
                urlOverridden: false,
                secretOption: 0,
                secrets: (source.getAllSecretKindOptions(input.kind)[0] ?? []).map((kind) => ({ kind, value: "" })),
              },
        );
      };
      for (const entry of knownDiscovery?.integrations ?? []) {
        if (integrationIds.includes(entry.sourceId))
          add({
            sourceId: entry.sourceId,
            kind: entry.kind,
            name: entry.containerName,
            fallback: entry.suggestedUrl,
            port: entry.publishedPort ?? undefined,
            source: "docker",
          });
      }
      for (const kind of selectedKinds)
        add({
          sourceId: `manual:${kind}`,
          kind,
          name: source.getIntegrationName(kind),
          fallback: source.getIntegrationDefaultUrl(kind) ?? null,
          source: "manual",
        });
      return next;
    });
  }, [knownDiscovery, integrationIds, selectedKinds, source, serverOrigin, urlMode]);

  useEffect(() => {
    if (previousSection.current === section) return;
    previousSection.current = section;
    if (focusHeading.current) heading.current?.focus();
    focusHeading.current = true;
  }, [section]);

  const appUrls = useMemo(
    () =>
      Object.fromEntries(
        (knownDiscovery?.apps ?? []).map((app) => [
          app.sourceId,
          source.resolveDiscoveredAppUrl(
            appOverrides[app.sourceId],
            app.suggestedUrl,
            serverOrigin
              ? source.buildAppUrl(
                  app.detectedType ?? app.containerName,
                  serverOrigin,
                  urlMode,
                  app.publishedPort ?? undefined,
                )
              : null,
          ),
        ]),
      ),
    [knownDiscovery, appOverrides, source, serverOrigin, urlMode],
  );
  const completeDrafts = drafts.filter(
    (draft) => draft.url.trim().length > 0 && draft.secrets.every((secret) => secret.value.trim().length > 0),
  );
  const incomplete = completeDrafts.length !== drafts.length;
  const selectedApps = (knownDiscovery?.apps ?? []).filter((app) => appIds.includes(app.sourceId));
  const missingApp = selectedApps.find((app) => !(appUrls[app.sourceId] ?? "").trim());
  const boardErrors = source.getBoardValidationErrors({
    attempted,
    hasExistingBoards: environment.availableBoards.length > 0,
    selectedBoardId: boardId,
    boardName,
  });
  const validBoardName = source.boardNameSchema.safeParse(boardName);
  const previewKinds = [
    ...new Set([
      ...source.generalWidgets,
      ...completeDrafts.flatMap((draft) => source.getWidgetKindsForIntegration(draft.kind)),
      ...selectedApps.flatMap((app) => (app.widgetKind ? [app.widgetKind] : [])),
    ]),
  ];
  const missingPreviewKinds = previewKinds.filter((kind) => !source.widgetPreviewSizes.has(kind));
  const previewItems = [
    ...previewKinds.flatMap((kind) => {
      const size = source.widgetPreviewSizes.get(kind);
      return size ? [{ id: `widget:${kind}`, ...size }] : [];
    }),
    ...Array.from({ length: completeDrafts.length + selectedApps.length }, (_, index) => ({
      id: `app:${index}`,
      width: 1,
      height: 1,
    })),
  ].slice(0, 12);
  const index = sections.indexOf(section);
  const updateDraft = (id: string, patch: Partial<EditableIntegration<Kind, Secret>>) =>
    setDrafts((current) => current.map((draft) => (draft.sourceId === id ? { ...draft, ...patch } : draft)));
  const selectSection = (value: Section) => {
    setIncompleteConfirmation(false);
    setSection(value);
  };
  const move = (direction: -1 | 1) => {
    const next = sections[index + direction];
    if (next) selectSection(next);
  };
  const keyDown = (event: KeyboardEvent<HTMLButtonElement>, position: number) => {
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? sections.length - 1
          : event.key === "ArrowRight" || event.key === "ArrowDown"
            ? (position + 1) % sections.length
            : event.key === "ArrowLeft" || event.key === "ArrowUp"
              ? (position - 1 + sections.length) % sections.length
              : null;
    if (next === null) return;
    const destination = sections[next];
    if (!destination) return;
    event.preventDefault();
    focusHeading.current = false;
    selectSection(destination);
    navigation.current[next]?.focus();
  };
  const continueSetup = () => {
    if (section === "essentials" && !serverOrigin.trim()) return;
    if (section === "connect") {
      if (missingApp) {
        setAppErrorId(missingApp.sourceId);
        return;
      }
      setAppErrorId(null);
      if (incomplete) {
        setIncompleteConfirmation(true);
        return;
      }
    }
    if (section === "board") {
      setAttempted(true);
      if ((!boardId && environment.availableBoards.length > 0) || !boardName.trim() || !validBoardName.success) return;
    }
    if (section !== "review") move(1);
  };
  const IntegrationSelect = source.IntegrationMultiSelectGrid;
  const LanguageSelect = source.LanguageCombobox;
  const ThemeSelect = source.ColorSchemeCombobox;
  const BoardColor = source.BoardColorInput;
  const CornerPicker = source.CornerStylePicker;
  const ServiceUrl = source.ServiceUrlTemplate;
  const Wordmark = source.OnboardingWordmark;
  const mcpConfig = JSON.stringify(
    { mcpServers: { homarr: { url: environment.mcpEndpoint, headers: { ApiKey: "<your-api-key>" } } } },
    null,
    2,
  );
  const summary = [
    { icon: IconLayoutDashboard, label: t("init.studio.review.board"), value: boardName },
    {
      icon: IconLayoutColumns,
      label: t("init.studio.review.columns"),
      value: t("init.studio.review.columnsValue", { count: columnCount }),
    },
    {
      icon: IconLayoutSidebar,
      label: t("init.studio.review.sidebars"),
      value: t("init.studio.review.sidebarsValue", { count: Number(leftSidebar) + Number(rightSidebar) }),
    },
    { icon: IconDeviceMobile, label: t("init.studio.review.layouts"), value: t("init.studio.review.layoutsValue") },
    {
      icon: IconPlugConnected,
      label: t("init.studio.review.integrations"),
      value: t("init.studio.review.integrationsValue", { count: completeDrafts.length }),
    },
    {
      icon: IconApps,
      label: t("init.studio.review.apps"),
      value: t("init.studio.review.appsValue", { count: completeDrafts.length + selectedApps.length }),
    },
    { icon: IconLanguage, label: t("init.studio.review.language"), value: selectedLocale },
    {
      icon: IconSunMoon,
      label: t("init.studio.review.theme"),
      value: t(`init.studio.review.${themeKey(colorScheme)}`),
    },
    {
      icon: IconPalette,
      label: t("init.studio.review.colors"),
      value: (
        <Group gap="xs" wrap="nowrap">
          <ColorSwatch color={primaryColor} size={18} />
          <Text size="sm" fw={650} ff="monospace">
            {primaryColor}
          </Text>
          <ColorSwatch color={secondaryColor} size={18} />
          <Text size="sm" fw={650} ff="monospace">
            {secondaryColor}
          </Text>
        </Group>
      ),
    },
    { icon: IconBorderRadius, label: t("init.studio.review.radius"), value: itemRadius.toUpperCase() },
  ];
  let dockerStatus: CapabilityStatus = "unavailable";
  if (discovery.state.kind === "disabled") dockerStatus = "disabled";
  else if (discovery.state.kind === "loading") dockerStatus = "checking";
  else if (discovery.state.kind === "ready") {
    if (discovery.state.data.status === "success") dockerStatus = "available";
    else if (discovery.state.data.status === "empty") dockerStatus = "empty";
    else if (discovery.state.data.status === "partial") dockerStatus = "partial";
  }

  return (
    <main className={classes.page} style={style}>
      <Backdrop />
      <div className={classes.shell}>
        {props.displayLabel ? (
          <Alert color="yellow" role="alert" mb="lg">
            {props.displayLabel}
          </Alert>
        ) : null}
        <Group className={classes.topbar} justify="center" mb="lg">
          <Wordmark
            primaryColor={primaryColor}
            secondaryColor={secondaryColor.toLowerCase() === "#fd7e14" ? undefined : secondaryColor}
          />
        </Group>
        <Paper className={classes.studio} radius="lg">
          <div className={classes.studioGrid}>
            <nav className={classes.rail} aria-label={t("init.studio.navigationLabel")}>
              <Timeline
                active={index}
                bulletSize={32}
                lineWidth={2}
                color={primaryColor}
                className={classes.timeline}
                classNames={{ itemBullet: classes.timelineBullet }}
              >
                {sections.map((value, position) => {
                  const Icon = sectionIcons[value];
                  return (
                    <Timeline.Item
                      key={value}
                      bullet={<Icon size={16} aria-hidden />}
                      title={
                        <UnstyledButton
                          className={classes.timelineButton}
                          data-active={section === value}
                          ref={(node) => {
                            navigation.current[position] = node;
                          }}
                          aria-current={section === value ? "step" : undefined}
                          aria-controls="onboarding-studio-section"
                          aria-label={`${t(`init.studio.navigation.${value}`)} (${position + 1}/${sections.length})`}
                          tabIndex={section === value ? 0 : -1}
                          onKeyDown={(event) => keyDown(event, position)}
                          onClick={() => selectSection(value)}
                        >
                          <Stack gap={0} align="flex-start">
                            <Text className={classes.timelineLabel} size="sm" fw={section === value ? 650 : 500}>
                              {t(`init.studio.navigation.${value}`)}
                            </Text>
                            <Text className={classes.timelineLabel} size="xs" c="dimmed">
                              {position + 1} / {sections.length}
                            </Text>
                          </Stack>
                        </UnstyledButton>
                      }
                    />
                  );
                })}
              </Timeline>
            </nav>
            <section id="onboarding-studio-section" className={classes.content} aria-labelledby="studio-section-title">
              <Stack gap="xl">
                <Stack gap={4} mb="xl">
                  <Title id="studio-section-title" ref={heading} order={2} tabIndex={-1}>
                    {t(`init.studio.${section}.title`)}
                  </Title>
                  {section !== "extend" ? (
                    <Text c="dimmed" maw="60ch">
                      {t(`init.studio.${section}.description`)}
                    </Text>
                  ) : null}
                </Stack>

                {section === "essentials" ? (
                  <Stack>
                    <SimpleGrid cols={{ base: 1, sm: 2 }}>
                      <LanguageSelect
                        label={t("init.studio.essentials.language")}
                        value={selectedLocale}
                        onChange={setSelectedLocale}
                        width="100%"
                        withinPortal
                      />
                      <ThemeSelect
                        label={t("init.studio.essentials.theme")}
                        value={colorScheme}
                        onChange={setColorScheme}
                        width="100%"
                      />
                    </SimpleGrid>
                    <Alert>{t("init.studio.essentials.serverOriginHelp")}</Alert>
                    <ServiceUrl
                      serverOrigin={serverOrigin}
                      onServerOriginChange={setServerOrigin}
                      mode={urlMode}
                      onModeChange={setUrlMode}
                      required
                      readOnly={!hydrated}
                    />
                    <Switch
                      label={t("init.studio.essentials.analytics")}
                      description={t("init.studio.essentials.analyticsDescription")}
                      checked={analyticsEnabled}
                      onChange={(event) => setAnalyticsEnabled(event.currentTarget.checked)}
                    />
                  </Stack>
                ) : null}

                {section === "discover" ? (
                  <Stack>
                    <CapabilityRow
                      t={t}
                      className={classes.sectionCard}
                      icon={IconDatabase}
                      title={t("init.studio.discover.database")}
                      status="available"
                      detail={environment.databaseDriver}
                    />
                    <CapabilityRow
                      t={t}
                      className={classes.sectionCard}
                      icon={IconBrandDocker}
                      title={t("init.studio.discover.docker")}
                      status={dockerStatus}
                      detail={
                        discovery.state.kind === "ready"
                          ? t("init.studio.discover.found", {
                              integrations: String(discovery.state.data.integrations.length),
                              apps: String(discovery.state.data.apps.length),
                            })
                          : t(`init.studio.discover.status.${dockerStatus}`)
                      }
                      action={
                        client !== null && environment.dockerConfigured ? (
                          <ActionIcon
                            size={44}
                            variant="subtle"
                            aria-label={t("common.action.tryAgain")}
                            onClick={discovery.retry}
                            loading={discovery.state.kind === "loading"}
                          >
                            <IconRefresh size={18} />
                          </ActionIcon>
                        ) : undefined
                      }
                    />
                    {(["kubernetes", "workshop"] as const).map((kind) => {
                      let status: CapabilityStatus = "unavailable";
                      if (kind === "kubernetes" && !environment.kubernetesConfigured) status = "disabled";
                      else if (capabilities.state.kind === "loading") status = "checking";
                      else if (capabilities.state.kind === "ready") status = capabilities.state.data[kind].status;
                      let detail = t(`init.studio.discover.status.${status}`);
                      if (
                        kind === "kubernetes" &&
                        capabilities.state.kind === "ready" &&
                        capabilities.state.data.kubernetes.status === "available"
                      )
                        detail = t("init.studio.discover.kubernetesAvailable", {
                          version:
                            capabilities.state.data.kubernetes.detail ?? t("init.studio.discover.unknownVersion"),
                        });
                      else if (kind === "kubernetes" && status !== "checking")
                        detail = t(
                          `init.studio.discover.${status === "disabled" ? "kubernetesDisabled" : "kubernetesUnavailable"}`,
                        );
                      else if (kind === "workshop" && status !== "checking")
                        detail = t(
                          `init.studio.discover.${status === "available" ? "workshopAvailable" : "workshopUnavailable"}`,
                        );
                      return (
                        <CapabilityRow
                          key={kind}
                          t={t}
                          className={classes.sectionCard}
                          icon={kind === "kubernetes" ? IconServer : IconSparkles}
                          title={t(`init.studio.discover.${kind === "workshop" ? "assistantWorkshop" : "kubernetes"}`)}
                          status={status}
                          detail={detail}
                          action={
                            client !== null && (kind === "workshop" || environment.kubernetesConfigured) ? (
                              <ActionIcon
                                size={44}
                                variant="subtle"
                                aria-label={t(
                                  `init.studio.discover.${kind === "workshop" ? "retryWorkshop" : "retryKubernetes"}`,
                                )}
                                onClick={capabilities.retry}
                                loading={capabilities.state.kind === "loading"}
                              >
                                <IconRefresh size={18} />
                              </ActionIcon>
                            ) : undefined
                          }
                        />
                      );
                    })}
                    {discovery.state.kind === "error" ? (
                      <Alert color="red" role="alert">
                        {onboardingError(discovery.state.error, t)}
                      </Alert>
                    ) : null}
                    {capabilities.state.kind === "error" ? (
                      <Alert color="red" role="alert">
                        {onboardingError(capabilities.state.error, t)}
                      </Alert>
                    ) : null}
                    {discovery.state.kind === "ready" &&
                    (discovery.state.data.status === "partial" || discovery.state.data.status === "unavailable") ? (
                      <Alert color="orange" title={t("init.studio.discover.partialTitle")}>
                        <Stack gap="xs">
                          <Text size="sm">{t("init.studio.discover.partialDescription")}</Text>
                          {discovery.state.data.hosts
                            .filter((host) => host.status === "unavailable")
                            .map((host) => (
                              <Text key={host.host} size="sm">
                                <Text component="span" fw={650}>
                                  {host.host}:
                                </Text>{" "}
                                {t("init.studio.discover.status.unavailable")}
                              </Text>
                            ))}
                        </Stack>
                      </Alert>
                    ) : null}
                  </Stack>
                ) : null}

                {section === "connect" ? (
                  <Stack>
                    {environment.dockerConfigured && discovery.state.kind !== "ready" ? (
                      <Alert>
                        {t(
                          `init.studio.discover.status.${discovery.state.kind === "loading" ? "checking" : "unavailable"}`,
                        )}
                      </Alert>
                    ) : null}
                    {knownDiscovery && knownDiscovery.integrations.length > 0 ? (
                      <Fieldset
                        legend={t("init.studio.connect.discoveredIntegrations", {
                          count: String(knownDiscovery.integrations.length),
                        })}
                      >
                        <Checkbox.Group value={integrationIds} onChange={setIntegrationIds}>
                          <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }}>
                            {knownDiscovery.integrations.map((entry) => (
                              <Checkbox.Card
                                key={entry.sourceId}
                                value={entry.sourceId}
                                className={classes.discoveryChoice}
                                aria-label={t("init.studio.connect.detectedIntegrationLabel", {
                                  name: entry.containerName,
                                  kind: source.getIntegrationName(entry.kind),
                                })}
                                p="sm"
                                radius="md"
                              >
                                <Group wrap="nowrap">
                                  <Checkbox.Indicator />
                                  <IntegrationAvatar kind={entry.kind} size="sm" radius="sm" />
                                  <Stack gap={0} miw={0}>
                                    <Text size="sm" fw={600} truncate>
                                      {entry.containerName}
                                    </Text>
                                    <Text size="xs" c="dimmed" truncate>
                                      {source.getIntegrationName(entry.kind)}
                                    </Text>
                                  </Stack>
                                </Group>
                              </Checkbox.Card>
                            ))}
                          </SimpleGrid>
                        </Checkbox.Group>
                      </Fieldset>
                    ) : null}
                    {knownDiscovery && knownDiscovery.apps.length > 0 ? (
                      <Fieldset
                        legend={t("init.studio.connect.discoveredApps", { count: String(knownDiscovery.apps.length) })}
                      >
                        <SimpleGrid className={classes.detectedAppGrid} cols={{ base: 1, xs: 2, md: 3 }}>
                          {knownDiscovery.apps.map((app) => (
                            <div key={app.sourceId} className={classes.detectedAppItem}>
                              <Checkbox.Card
                                checked={appIds.includes(app.sourceId)}
                                className={classes.discoveryChoice}
                                aria-label={t("init.studio.connect.detectedAppLabel", { name: app.containerName })}
                                value={app.sourceId}
                                p="sm"
                                radius="md"
                                onChange={() => {
                                  const checked = !appIds.includes(app.sourceId);
                                  setAppIds((current) =>
                                    checked ? [...current, app.sourceId] : current.filter((id) => id !== app.sourceId),
                                  );
                                }}
                              >
                                <Group wrap="nowrap" w="100%">
                                  <Checkbox.Indicator />
                                  <Avatar src={app.iconUrl} size="sm" radius="sm">
                                    {app.containerName.at(0)}
                                  </Avatar>
                                  <Text size="sm" fw={600} truncate style={{ flex: 1, minWidth: 0 }}>
                                    {app.containerName}
                                  </Text>
                                </Group>
                              </Checkbox.Card>
                              {appIds.includes(app.sourceId) ? (
                                <TextInput
                                  label={`${app.containerName}: ${t("init.studio.connect.url")}`}
                                  value={appUrls[app.sourceId] ?? ""}
                                  required
                                  error={
                                    appErrorId === app.sourceId
                                      ? t("init.studio.connect.appAddressRequired", { name: app.containerName })
                                      : undefined
                                  }
                                  onChange={(event) => {
                                    const value = event.currentTarget.value;
                                    setAppOverrides((current) => ({ ...current, [app.sourceId]: value }));
                                    if (appErrorId === app.sourceId) setAppErrorId(null);
                                  }}
                                />
                              ) : null}
                            </div>
                          ))}
                        </SimpleGrid>
                      </Fieldset>
                    ) : null}
                    <Fieldset legend={t("init.studio.connect.otherIntegrations")}>
                      <IntegrationSelect
                        selectedKinds={selectedKinds}
                        onSelectionChange={setSelectedKinds}
                        detectedKinds={new Set((knownDiscovery?.integrations ?? []).map((entry) => entry.kind))}
                        onboarding
                      />
                    </Fieldset>
                    <IntegrationConnections
                      drafts={drafts}
                      source={source}
                      client={client}
                      update={updateDraft}
                      onAuthorityFailure={onAuthorityFailure}
                    />
                  </Stack>
                ) : null}

                {section === "board" ? (
                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
                    <Stack>
                      {environment.availableBoards.length > 1 ? (
                        <Select
                          label={t("init.studio.board.target")}
                          description={t("init.studio.board.targetDescription")}
                          data={environment.availableBoards.map((board) => ({ value: board.id, label: board.name }))}
                          value={boardId}
                          searchable
                          allowDeselect={false}
                          required
                          error={boardErrors.target ? t("init.studio.board.targetRequired") : undefined}
                          onChange={(value) => {
                            setBoardId(value);
                            const board = environment.availableBoards.find((entry) => entry.id === value);
                            if (board) setBoardName(board.name);
                          }}
                        />
                      ) : null}
                      <TextInput
                        label={t("init.studio.board.name")}
                        description={t("init.studio.board.nameDescription")}
                        value={boardName}
                        onChange={(event) => setBoardName(event.currentTarget.value.replace(/[^A-Za-z0-9-_]/g, ""))}
                        error={
                          boardErrors.name || (attempted && !validBoardName.success)
                            ? t("init.studio.board.nameRequired")
                            : undefined
                        }
                        required
                      />
                      <SimpleGrid cols={{ base: 1, sm: 2 }}>
                        <BoardColor
                          label={t("init.studio.board.primaryColor")}
                          value={primaryColor}
                          onChange={setPrimaryColor}
                          defaultColor="#fa5252"
                        />
                        <BoardColor
                          label={t("init.studio.board.secondaryColor")}
                          value={secondaryColor}
                          onChange={setSecondaryColor}
                          defaultColor="#fd7e14"
                        />
                      </SimpleGrid>
                      {primaryColor.toLowerCase() !== "#fa5252" || secondaryColor.toLowerCase() !== "#fd7e14" ? (
                        <Button
                          variant="subtle"
                          size="compact-sm"
                          leftSection={<IconRefresh size={14} />}
                          onClick={() => {
                            setPrimaryColor("#fa5252");
                            setSecondaryColor("#fd7e14");
                          }}
                        >
                          {t("init.studio.board.resetColors")}
                        </Button>
                      ) : null}
                      <CornerPicker
                        label={t("init.studio.board.radius")}
                        value={itemRadius}
                        onChange={setItemRadius}
                        labels={{
                          xs: t("init.studio.board.radiusOptions.xs"),
                          sm: t("init.studio.board.radiusOptions.sm"),
                          md: t("init.studio.board.radiusOptions.md"),
                          lg: t("init.studio.board.radiusOptions.lg"),
                          xl: t("init.studio.board.radiusOptions.xl"),
                        }}
                      />
                    </Stack>
                    <Stack gap="lg">
                      <Group justify="space-between" align="flex-start">
                        <Stack gap={2}>
                          <Text size="sm" fw={500} id="onboarding-columns-label">
                            {t("init.studio.board.columns")}
                          </Text>
                          <Text size="xs" c="dimmed" maw="44ch">
                            {t("init.studio.board.columnsDescription")}
                          </Text>
                        </Stack>
                        <Badge variant="light">{t("init.studio.board.columnCount", { count: columnCount })}</Badge>
                      </Group>
                      <Slider
                        min={8}
                        max={24}
                        step={1}
                        value={columnCount}
                        onChange={setColumnCount}
                        thumbLabel={t("init.studio.board.columns")}
                        thumbValueText={(value) => t("init.studio.board.columnCount", { count: value })}
                        marks={[8, 10, 12, 18, 24].map((value) => ({ value, label: String(value) }))}
                        mb="md"
                      />
                      {missingPreviewKinds.length > 0 ? (
                        <Alert color="yellow" role="alert">
                          {source.holds.preview}
                        </Alert>
                      ) : (
                        <figure
                          className={classes.preview}
                          aria-label={t("init.studio.board.previewLabel")}
                          data-layout-role="base"
                          data-layout-columns={Math.max(1, columnCount - Number(leftSidebar) - Number(rightSidebar))}
                          style={{
                            gridTemplateColumns: `${leftSidebar ? "0.24fr " : ""}minmax(0, 1fr)${rightSidebar ? " 0.24fr" : ""}`,
                          }}
                        >
                          {leftSidebar ? <div className={classes.previewLane} /> : null}
                          <div className={classes.previewLane}>
                            <div
                              className={classes.previewTiles}
                              style={{
                                gridTemplateColumns: `repeat(${Math.max(1, columnCount - Number(leftSidebar) - Number(rightSidebar))}, minmax(0, 1fr))`,
                              }}
                            >
                              {previewItems.map((item) => (
                                <div
                                  key={item.id}
                                  className={classes.previewTile}
                                  aria-hidden
                                  style={{
                                    gridColumn: `span ${Math.min(Math.max(1, columnCount - Number(leftSidebar) - Number(rightSidebar)), item.width)}`,
                                    gridRow: `span ${Math.min(3, item.height)}`,
                                    borderRadius: `var(--mantine-radius-${itemRadius})`,
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                          {rightSidebar ? <div className={classes.previewLane} /> : null}
                        </figure>
                      )}
                      <SimpleGrid cols={{ base: 1, sm: 2 }}>
                        <Switch
                          label={t("init.studio.board.leftSidebar")}
                          checked={leftSidebar}
                          onChange={(event) => setLeftSidebar(event.currentTarget.checked)}
                        />
                        <Switch
                          label={t("init.studio.board.rightSidebar")}
                          checked={rightSidebar}
                          onChange={(event) => setRightSidebar(event.currentTarget.checked)}
                        />
                      </SimpleGrid>
                    </Stack>
                  </SimpleGrid>
                ) : null}

                {section === "extend" ? (
                  <Tabs defaultValue="workshop">
                    <Tabs.List grow aria-label={t("init.studio.extend.tabsLabel")}>
                      <Tabs.Tab value="workshop" leftSection={<IconSparkles size={16} />}>
                        {t("init.studio.extend.workshop")}
                      </Tabs.Tab>
                      <Tabs.Tab value="assistant" leftSection={<IconRobot size={16} />}>
                        {t("init.studio.extend.assistant")}
                      </Tabs.Tab>
                      <Tabs.Tab value="mcp" leftSection={<IconCode size={16} />}>
                        MCP
                      </Tabs.Tab>
                    </Tabs.List>
                    <Tabs.Panel value="workshop" pt="md">
                      <Stack>
                        <Paper className={classes.sectionCard} radius="lg" p="xl">
                          <Group wrap="nowrap" align="flex-start">
                            <ThemeIcon variant="light" size={54} radius="lg">
                              <IconSparkles size={26} />
                            </ThemeIcon>
                            <Stack gap="xs">
                              <Text fw={700} size="lg">
                                {t("init.studio.extend.workshopSetup.title")}
                              </Text>
                              <Text c="dimmed">{t("init.studio.extend.workshopSetup.description")}</Text>
                              <SimpleGrid cols={{ base: 1, sm: 3 }} mt="sm">
                                {(["discover", "install", "publish"] as const).map((feature) => (
                                  <Stack key={feature} gap={3}>
                                    <Text fw={650} size="sm">
                                      {t(`init.studio.extend.workshopSetup.${feature}Title`)}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                      {t(`init.studio.extend.workshopSetup.${feature}Description`)}
                                    </Text>
                                  </Stack>
                                ))}
                              </SimpleGrid>
                            </Stack>
                          </Group>
                        </Paper>
                        <Text>
                          {t(
                            `init.studio.extend.workshopSetup.${capabilities.state.kind === "loading" ? "checking" : capabilities.state.kind === "ready" && capabilities.state.data.workshop.status === "available" ? "available" : "unavailable"}`,
                          )}
                        </Text>
                        {environment.workshopUrl ? (
                          <Button
                            component="a"
                            href={environment.workshopUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            rightSection={<IconExternalLink size={16} />}
                          >
                            {t("init.studio.extend.workshopSetup.browse")}
                          </Button>
                        ) : null}
                      </Stack>
                    </Tabs.Panel>
                    <Tabs.Panel value="assistant" pt="md">
                      {environment.canConfigurePrivileged ? (
                        (props.assistantConfiguration ?? <Alert>{source.holds.assistant}</Alert>)
                      ) : (
                        <Alert>
                          <Stack>
                            <Text>{t("init.studio.extend.assistantSetup.loginDescription")}</Text>
                            <Button component={Link} href="/auth/login?callbackUrl=%2Fmanage%2Fassistant">
                              {t("init.studio.extend.assistantSetup.loginAction")}
                            </Button>
                          </Stack>
                        </Alert>
                      )}
                    </Tabs.Panel>
                    <Tabs.Panel value="mcp" pt="md">
                      <Stack>
                        <Text>{t("init.studio.extend.mcpSetup.description")}</Text>
                        <TextInput
                          label={t("init.studio.extend.mcpSetup.endpoint")}
                          value={environment.mcpEndpoint}
                          readOnly
                        />
                        <Alert color="yellow" id="onboarding-key-hold">
                          {source.holds.apiKey}
                        </Alert>
                        {environment.canConfigurePrivileged ? (
                          <Button disabled aria-describedby="onboarding-key-hold">
                            {t("init.studio.extend.mcpSetup.createKey")}
                          </Button>
                        ) : (
                          <Text>{t("init.studio.extend.mcpSetup.loginRequired")}</Text>
                        )}
                        <CopyButton value={mcpConfig}>
                          {({ copied, copy }) => (
                            <Button
                              variant="subtle"
                              size="compact-sm"
                              onClick={copy}
                              leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                            >
                              {t(`init.studio.extend.mcpSetup.${copied ? "copied" : "copy"}`)}
                            </Button>
                          )}
                        </CopyButton>
                        <Code block>{mcpConfig}</Code>
                        <Button component={Link} href="/manage/tools/api" variant="default">
                          {t("init.studio.extend.mcpSetup.advanced")}
                        </Button>
                      </Stack>
                    </Tabs.Panel>
                  </Tabs>
                ) : null}

                {section === "review" ? (
                  <Stack>
                    <SimpleGrid cols={{ base: 1, xs: 2, lg: 3 }}>
                      {summary.map(({ icon: Icon, label, value }) => (
                        <Paper key={label} className={classes.sectionCard} radius="lg" p="md">
                          <Group wrap="nowrap">
                            <ThemeIcon variant="light" size="lg">
                              <Icon size={20} />
                            </ThemeIcon>
                            <Stack gap={0} miw={0}>
                              <Text size="xs" c="dimmed">
                                {label}
                              </Text>
                              {typeof value === "string" ? (
                                <Text fw={650} truncate>
                                  {value}
                                </Text>
                              ) : (
                                value
                              )}
                            </Stack>
                          </Group>
                        </Paper>
                      ))}
                    </SimpleGrid>
                    <Alert icon={<IconSparkles size={18} />} title={t("init.studio.review.automaticTitle")} my="xs">
                      {t("init.studio.review.automaticDescription")}
                    </Alert>
                    <Alert color="yellow" role="alert" id="onboarding-completion-hold">
                      {source.holds.transition}
                    </Alert>
                    {incomplete ? (
                      <Alert color="yellow">{t("init.studio.connect.incompleteConfirmation")}</Alert>
                    ) : null}
                    {missingApp ? (
                      <Alert color="red">
                        {t("init.studio.connect.appAddressRequired", { name: missingApp.containerName })}
                      </Alert>
                    ) : null}
                  </Stack>
                ) : null}

                <Group className={classes.stickyActions} justify="space-between" wrap="nowrap">
                  <Button
                    className={classes.backAction}
                    size="sm"
                    variant="default"
                    leftSection={<IconArrowLeft size={16} />}
                    disabled={index === 0}
                    onClick={() => move(-1)}
                  >
                    {t("init.studio.back")}
                  </Button>
                  {section === "review" ? (
                    <Button size="sm" disabled aria-describedby="onboarding-completion-hold">
                      {t("init.studio.buildBoard")}
                    </Button>
                  ) : section === "connect" && incomplete ? (
                    <Popover
                      opened={incompleteConfirmation}
                      onDismiss={() => setIncompleteConfirmation(false)}
                      transitionProps={{ duration: 0 }}
                      position="top-end"
                      width={320}
                      shadow="md"
                      withArrow
                      trapFocus
                      returnFocus
                    >
                      <Popover.Target>
                        <Button
                          size="sm"
                          rightSection={<IconArrowRight size={16} />}
                          aria-haspopup="dialog"
                          aria-expanded={incompleteConfirmation}
                          onClick={continueSetup}
                        >
                          {t("common.action.continue")}
                        </Button>
                      </Popover.Target>
                      <Popover.Dropdown aria-label={t("init.studio.connect.incompleteConfirmation")}>
                        <Stack gap="sm">
                          <Text size="sm">{t("init.studio.connect.incompleteConfirmation")}</Text>
                          <Group justify="flex-end" gap="xs">
                            <Button size="xs" variant="default" onClick={() => setIncompleteConfirmation(false)}>
                              {t("common.action.cancel")}
                            </Button>
                            <Button size="xs" onClick={() => move(1)}>
                              {t("common.action.confirm")}
                            </Button>
                          </Group>
                        </Stack>
                      </Popover.Dropdown>
                    </Popover>
                  ) : (
                    <Button
                      size="sm"
                      rightSection={<IconArrowRight size={16} />}
                      disabled={section === "essentials" && !serverOrigin.trim()}
                      onClick={continueSetup}
                    >
                      {t("common.action.continue")}
                    </Button>
                  )}
                </Group>
              </Stack>
            </section>
          </div>
        </Paper>
      </div>
    </main>
  );
}

function themeKey(colorScheme: ColorScheme): "themeAuto" | "themeLight" | "themeDark" {
  return colorScheme === "auto" ? "themeAuto" : colorScheme === "light" ? "themeLight" : "themeDark";
}

type CapabilityStatus = "checking" | "available" | "partial" | "empty" | "disabled" | "unavailable";

function CapabilityRow({
  t,
  className,
  icon: Icon,
  title,
  status,
  detail,
  action,
}: {
  t: Translate;
  className: string | undefined;
  icon: typeof IconServer;
  title: string;
  status: CapabilityStatus;
  detail: string;
  action?: ReactNode;
}) {
  let color = "gray";
  if (status === "available") color = "green";
  else if (status === "checking") color = "blue";
  else if (status === "partial" || status === "empty") color = "yellow";
  return (
    <Paper
      component="output"
      className={className}
      radius="lg"
      p="md"
      aria-live="polite"
      aria-atomic="true"
      aria-busy={status === "checking"}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group wrap="nowrap" miw={0}>
          <ThemeIcon variant="light" color={color} size="lg">
            <Icon size={20} />
          </ThemeIcon>
          <Stack gap={1} miw={0}>
            <Text fw={650}>{title}</Text>
            <Text size="sm" c="dimmed" truncate>
              {detail}
            </Text>
          </Stack>
        </Group>
        <Group gap="xs" wrap="nowrap">
          <Badge variant="light" color={color}>
            {t(`init.studio.discover.status.${status}`)}
          </Badge>
          {action}
        </Group>
      </Group>
    </Paper>
  );
}
