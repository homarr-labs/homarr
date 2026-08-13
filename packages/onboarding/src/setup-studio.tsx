"use client";

import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  ActionIcon,
  Alert,
  Anchor,
  Avatar,
  Badge,
  Button,
  Checkbox,
  Code,
  ColorInput,
  CopyButton,
  Divider,
  Fieldset,
  Group,
  Image,
  Loader,
  Paper,
  PasswordInput,
  Progress,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  UnstyledButton,
  useMantineColorScheme,
} from "@mantine/core";
import type { MantineSize } from "@mantine/core";
import {
  IconAdjustments,
  IconApps,
  IconArrowLeft,
  IconArrowRight,
  IconBrandDocker,
  IconBrain,
  IconCheck,
  IconCode,
  IconCopy,
  IconDatabase,
  IconDeviceMobile,
  IconExternalLink,
  IconKey,
  IconLayoutDashboard,
  IconPalette,
  IconPlugConnected,
  IconRefresh,
  IconSearch,
  IconServer,
  IconSparkles,
  IconTool,
  IconWorld,
} from "@tabler/icons-react";
import { motion, useReducedMotion } from "motion/react";

import { clientApi } from "@homarr/api/client";
import type { RouterOutputs } from "@homarr/api";
import { revalidatePathActionAsync } from "@homarr/common/client";
import type {
  AssistantProvider,
  ColorScheme,
  IntegrationKind,
  IntegrationSecretKind,
  UrlTemplateMode,
} from "@homarr/definitions";
import {
  assistantProviderCanUseOpenRouterServerTools,
  assistantProviderIds,
  assistantProviderPresets,
  buildAppUrl,
  buildIntegrationUrl,
  getAllSecretKindOptions,
  getIntegrationApiKeyUrl,
  getIntegrationDefaultUrl,
  getIntegrationDocumentationUrl,
  getIntegrationName,
} from "@homarr/definitions";
import { showErrorNotification, showSuccessNotification, showWarningNotification } from "@homarr/notifications";
import type { SupportedLanguage } from "@homarr/translation";
import { localeConfigurations, supportedLanguages } from "@homarr/translation";
import { useChangeLocale, useCurrentLocale, useScopedI18n } from "@homarr/translation/client";
import { IntegrationAvatar, Link } from "@homarr/ui";
import { IntegrationMultiSelectGrid } from "@homarr/ui/integration-select-grid";

import type { OnboardingStudioProps } from "./types";
import classes from "./onboarding-studio.module.css";

type StudioSection = "essentials" | "discover" | "connect" | "board" | "extend" | "review";
type LayoutPreset = "balanced" | "wide" | "focused";

interface IntegrationDraft {
  id: string;
  sourceId?: string;
  integrationId?: string;
  appId?: string;
  kind: IntegrationKind;
  name: string;
  url: string;
  source: "manual" | "docker";
  secretOption: number;
  secrets: { kind: IntegrationSecretKind; value: string }[];
  saved: boolean;
  error: string | null;
}

type DockerDiscoveryData = RouterOutputs["onboard"]["discoverDockerServices"];

const sectionDefinitions = [
  { id: "essentials", icon: IconAdjustments },
  { id: "discover", icon: IconSearch },
  { id: "connect", icon: IconPlugConnected },
  { id: "board", icon: IconLayoutDashboard },
  { id: "extend", icon: IconSparkles },
  { id: "review", icon: IconCheck },
] as const;

const radiusValues = ["xs", "sm", "md", "lg", "xl"] as const;
const emptyDiscoveredIntegrations: DockerDiscoveryData["integrations"] = [];
const emptyDiscoveredApps: DockerDiscoveryData["apps"] = [];

export const SetupStudio = ({ environment }: OnboardingStudioProps) => {
  const t = useScopedI18n("init.studio");
  const currentLocale = useCurrentLocale();
  const { changeLocale, isPending: localePending } = useChangeLocale();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const reduceMotion = useReducedMotion();
  const [activeSection, setActiveSection] = useState<StudioSection>("essentials");
  const [serverOrigin, setServerOrigin] = useState("");
  const [urlMode, setUrlMode] = useState<UrlTemplateMode>("hostPort");
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [selectedKinds, setSelectedKinds] = useState<IntegrationKind[]>([]);
  const [drafts, setDrafts] = useState<IntegrationDraft[]>([]);
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [createdAppIdsBySource, setCreatedAppIdsBySource] = useState<Record<string, string>>({});
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(environment.initialBoard?.id ?? null);
  const [boardName, setBoardName] = useState(environment.initialBoard?.name ?? "dashboard");
  const [primaryColor, setPrimaryColor] = useState("#fa5252");
  const [secondaryColor, setSecondaryColor] = useState("#fd7e14");
  const [itemRadius, setItemRadius] = useState<MantineSize>("lg");
  const [layoutPreset, setLayoutPreset] = useState<LayoutPreset>("balanced");
  const [leftSidebar, setLeftSidebar] = useState(false);
  const [rightSidebar, setRightSidebar] = useState(false);
  const [applyProgress, setApplyProgress] = useState(0);
  const [applyMessage, setApplyMessage] = useState("");
  const [applyError, setApplyError] = useState<string | null>(null);
  const [appError, setAppError] = useState<string | null>(null);
  const sectionHeadingRef = useRef<HTMLHeadingElement>(null);
  const initialSection = useRef(true);
  const focusSectionHeading = useRef(true);

  const docker = clientApi.onboard.discoverDockerServices.useQuery(undefined, {
    enabled: environment.dockerConfigured,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const createIntegration = clientApi.onboard.createIntegration.useMutation();
  const createApps = clientApi.onboard.createAppsFromDiscovery.useMutation();
  const complete = clientApi.onboard.completeSetup.useMutation();
  const isApplying = complete.isPending || createIntegration.isPending || createApps.isPending;

  const dockerData = docker.data;
  const discoveredIntegrations = dockerData?.integrations ?? emptyDiscoveredIntegrations;
  const discoveredApps = dockerData?.apps ?? emptyDiscoveredApps;
  const detectedKinds = useMemo(
    () => new Set(discoveredIntegrations.map((integration) => integration.kind)),
    [discoveredIntegrations],
  );

  useEffect(() => {
    if (!docker.data) return;
    setSelectedKinds((current) => [...new Set([...current, ...discoveredIntegrations.map((item) => item.kind)])]);
    setSelectedAppIds((current) =>
      current.length > 0 ? current : discoveredApps.map((application) => application.sourceId),
    );
  }, [docker.data, discoveredApps, discoveredIntegrations]);

  useEffect(() => {
    setDrafts((current) => {
      const next: IntegrationDraft[] = [];
      const existing = new Map(current.map((draft) => [draft.id, draft]));
      for (const discovered of discoveredIntegrations) {
        if (!selectedKinds.includes(discovered.kind)) continue;
        const id = discovered.sourceId;
        const generatedUrl =
          discovered.suggestedUrl ||
          (serverOrigin
            ? buildIntegrationUrl(discovered.kind, serverOrigin, urlMode, discovered.publishedPort ?? undefined)
            : "");
        const existingDraft = existing.get(id);
        next.push(
          existingDraft
            ? existingDraft.url || !generatedUrl
              ? existingDraft
              : { ...existingDraft, url: generatedUrl }
            : createDraft({
                id,
                sourceId: discovered.sourceId,
                kind: discovered.kind,
                name: discovered.containerName,
                url: generatedUrl,
                source: "docker",
              }),
        );
      }
      for (const kind of selectedKinds) {
        if (discoveredIntegrations.some((item) => item.kind === kind)) continue;
        const id = `manual:${kind}`;
        const generatedUrl = serverOrigin
          ? buildIntegrationUrl(kind, serverOrigin, urlMode)
          : getIntegrationDefaultUrl(kind);
        const existingDraft = existing.get(id);
        next.push(
          existingDraft
            ? existingDraft.url || !generatedUrl
              ? existingDraft
              : { ...existingDraft, url: generatedUrl }
            : createDraft({
                id,
                sourceId: id,
                kind,
                name: getIntegrationName(kind),
                url: generatedUrl ?? "",
                source: "manual",
              }),
        );
      }
      return next;
    });
  }, [discoveredIntegrations, selectedKinds, serverOrigin, urlMode]);

  useEffect(() => {
    if (initialSection.current) {
      initialSection.current = false;
      return;
    }
    if (!focusSectionHeading.current) {
      focusSectionHeading.current = true;
      return;
    }
    sectionHeadingRef.current?.focus();
  }, [activeSection]);

  const activeIndex = sectionDefinitions.findIndex((section) => section.id === activeSection);
  const move = (direction: -1 | 1) => {
    const next = sectionDefinitions[activeIndex + direction];
    if (next) selectSection(next.id);
  };

  const selectSection = (section: StudioSection) => {
    setApplyError(null);
    setActiveSection(section);
  };

  const handleSectionKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? sectionDefinitions.length - 1
          : event.key === "ArrowRight" || event.key === "ArrowDown"
            ? (index + 1) % sectionDefinitions.length
            : event.key === "ArrowLeft" || event.key === "ArrowUp"
              ? (index - 1 + sectionDefinitions.length) % sectionDefinitions.length
              : null;
    if (nextIndex === null) return;
    event.preventDefault();
    const nextSection = sectionDefinitions[nextIndex];
    if (!nextSection) return;
    focusSectionHeading.current = false;
    selectSection(nextSection.id);
    const nextButton = event.currentTarget.parentElement?.querySelectorAll("button").item(nextIndex);
    if (nextButton instanceof HTMLButtonElement) nextButton.focus();
  };

  const updateDraft = (id: string, patch: Partial<IntegrationDraft>) => {
    setDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, ...patch, saved: patch.saved ?? false } : draft)),
    );
  };

  const selectSecretOption = (draft: IntegrationDraft, option: number) => {
    const secretKinds = getAllSecretKindOptions(draft.kind)[option] ?? [];
    updateDraft(draft.id, {
      secretOption: option,
      secrets: secretKinds.map((kind) => ({
        kind,
        value: draft.secrets.find((secret) => secret.kind === kind)?.value ?? "",
      })),
    });
  };

  const applySetupAsync = async (includeSelections = true) => {
    setApplyError(null);
    setAppError(null);
    setApplyProgress(5);
    try {
      if (!selectedBoardId && environment.availableBoards.length > 0) {
        setActiveSection("board");
        throw new Error(t("board.targetRequired"));
      }
      if (!boardName.trim()) {
        setActiveSection("board");
        throw new Error(t("board.nameDescription"));
      }
      const draftsToApply = includeSelections ? drafts : [];
      const invalidDraft = draftsToApply.find(
        (draft) => !draft.url.trim() || draft.secrets.some((secret) => secret.value.trim().length === 0),
      );
      if (invalidDraft) {
        const message = t("connect.validationError", { name: invalidDraft.name });
        updateDraft(invalidDraft.id, { error: message });
        setActiveSection("connect");
        throw new Error(message);
      }

      const unsaved = draftsToApply.filter((draft) => !draft.saved);
      const selectedIntegrationIds = draftsToApply.flatMap((draft) =>
        draft.integrationId ? [draft.integrationId] : [],
      );
      const integrationAppIds = draftsToApply.flatMap((draft) => (draft.appId ? [draft.appId] : []));
      for (const [index, draft] of unsaved.entries()) {
        setApplyMessage(t("review.progress.integration", { name: draft.name }));
        setApplyProgress(10 + Math.round(((index + 1) / Math.max(unsaved.length, 1)) * 45));
        try {
          const discovered = draft.sourceId
            ? discoveredIntegrations.find((integration) => integration.sourceId === draft.sourceId)
            : undefined;
          const result = await createIntegration.mutateAsync({
            name: draft.name,
            url: draft.url,
            kind: draft.kind,
            secrets: draft.secrets,
            sourceId: draft.sourceId,
            iconUrl: discovered?.iconUrl ?? null,
            description: discovered?.description ?? null,
            pingUrl: discovered?.pingUrl ?? null,
          });
          if (result && "error" in result && result.error) {
            throw new Error(t("connect.connectionError", { name: draft.name }));
          }
          selectedIntegrationIds.push(result.id);
          integrationAppIds.push(result.appId);
          updateDraft(draft.id, { saved: true, error: null, integrationId: result.id, appId: result.appId });
        } catch (error) {
          const message = error instanceof Error ? error.message : t("common.unknownError");
          updateDraft(draft.id, { error: message });
          throw error;
        }
      }

      const appsToCreate = includeSelections
        ? discoveredApps.filter((app) => selectedAppIds.includes(app.sourceId))
        : [];
      let createdAppIds = appsToCreate.flatMap((app) => {
        const appId = createdAppIdsBySource[app.sourceId];
        return appId ? [appId] : [];
      });
      if (appsToCreate.length > 0) {
        setApplyMessage(t("review.progress.apps"));
        setApplyProgress(68);
        try {
          const result = await createApps.mutateAsync(
            appsToCreate.map((app) => ({
              sourceId: app.sourceId,
              name: app.containerName,
              href:
                app.suggestedUrl ||
                (serverOrigin
                  ? buildAppUrl(app.containerName, serverOrigin, urlMode, app.publishedPort ?? undefined)
                  : null),
              pingUrl: app.pingUrl ?? null,
              iconUrl: app.iconUrl,
              description: app.description ?? null,
            })),
          );
          const createdApps = Object.fromEntries(
            result.apps.flatMap((app) => (app.sourceId ? [[app.sourceId, app.id]] : [])),
          );
          setCreatedAppIdsBySource((current) => ({ ...current, ...createdApps }));
          createdAppIds = result.apps.map((app) => app.id);
        } catch (error) {
          setAppError(error instanceof Error ? error.message : t("common.unknownError"));
          setActiveSection("connect");
          throw error;
        }
      }

      setApplyMessage(t("review.progress.board"));
      setApplyProgress(84);
      const selectedSourceIds = new Set(draftsToApply.flatMap((draft) => (draft.sourceId ? [draft.sourceId] : [])));
      const completion = await complete.mutateAsync({
        server: {
          defaultLocale: currentLocale,
          defaultColorScheme: colorScheme as ColorScheme,
          analyticsEnabled,
        },
        board: {
          id: selectedBoardId ?? undefined,
          name: boardName,
          primaryColor,
          secondaryColor,
          itemRadius,
          layoutPreset,
          leftSidebar,
          rightSidebar,
        },
        selectedIntegrationIds,
        selectedAppIds: [...new Set([...integrationAppIds, ...createdAppIds])],
        selectedDockerSourceIds: [
          ...new Set([
            ...discoveredIntegrations
              .filter((integration) => integration.source === "label" && selectedSourceIds.has(integration.sourceId))
              .map((integration) => integration.sourceId),
            ...appsToCreate
              .filter((application) => application.source === "label")
              .map((application) => application.sourceId),
          ]),
        ],
        selectedWidgetKinds: [
          ...new Set(
            [
              ...discoveredIntegrations.filter((integration) => selectedSourceIds.has(integration.sourceId)),
              ...appsToCreate,
            ].flatMap((discovery) => (discovery.widgetKind ? [discovery.widgetKind] : [])),
          ),
        ],
      });
      const dockerWarningCount =
        completion.docker.missingSourceIds.length +
        completion.docker.ignoredSourceIds.length +
        completion.docker.skippedWidgets.length;
      if (dockerWarningCount > 0) {
        showWarningNotification({
          title: t("review.dockerWarningTitle"),
          message: t("review.dockerWarningDescription", { count: String(dockerWarningCount) }),
        });
      }
      setApplyMessage(t("review.progress.done"));
      setApplyProgress(100);
      await revalidatePathActionAsync("/init");
    } catch (error) {
      setApplyError(error instanceof Error ? error.message : t("common.unknownError"));
      setApplyProgress(0);
    }
  };

  const sectionProps: StudioSectionProps = {
    headingRef: sectionHeadingRef,
    environment,
    serverOrigin,
    setServerOrigin,
    urlMode,
    setUrlMode,
    analyticsEnabled,
    setAnalyticsEnabled,
    currentLocale,
    changeLocale,
    localePending,
    colorScheme: colorScheme as ColorScheme,
    setColorScheme,
    docker,
    dockerData,
    selectedKinds,
    setSelectedKinds,
    detectedKinds,
    drafts,
    updateDraft,
    selectSecretOption,
    discoveredApps,
    selectedAppIds,
    setSelectedAppIds,
    boardName,
    setBoardName,
    selectedBoardId,
    setSelectedBoardId,
    primaryColor,
    setPrimaryColor,
    secondaryColor,
    setSecondaryColor,
    itemRadius,
    setItemRadius,
    layoutPreset,
    setLayoutPreset,
    leftSidebar,
    setLeftSidebar,
    rightSidebar,
    setRightSidebar,
    applyProgress,
    applyMessage,
    applyError,
    appError,
  };

  return (
    <main className={classes.page}>
      <div className={classes.shell}>
        <Group className={classes.topbar} justify="space-between" mb="lg">
          <Image
            src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/homarr-wordmark-light.svg"
            alt="Homarr"
            className={classes.wordmark}
          />
          <Group gap="xs">
            <Badge variant="light">{t("setupBadge")}</Badge>
            <Badge variant="dot" color={environment.databaseDriver === "sqlite" ? "blue" : "grape"}>
              {environment.databaseDriver}
            </Badge>
          </Group>
        </Group>

        <Paper className={classes.studio} radius="lg">
          <div className={classes.studioGrid}>
            <nav className={classes.rail} aria-label={t("navigationLabel")}>
              <Stack className={classes.railList} gap={4}>
                <Stack gap={4} mb="md" px="xs" visibleFrom="md">
                  <Text fw={700}>{t("title")}</Text>
                  <Text size="xs" c="dimmed">
                    {t("subtitle")}
                  </Text>
                </Stack>
                {sectionDefinitions.map((section, index) => {
                  const Icon = section.icon;
                  const active = section.id === activeSection;
                  return (
                    <UnstyledButton
                      key={section.id}
                      className={classes.railButton}
                      data-active={active}
                      onClick={() => selectSection(section.id)}
                      onKeyDown={(event) => handleSectionKeyDown(event, index)}
                      aria-current={active ? "step" : undefined}
                      aria-controls="onboarding-studio-section"
                      tabIndex={active ? 0 : -1}
                    >
                      <Group wrap="nowrap" gap="sm">
                        <ThemeIcon variant={active ? "light" : "transparent"} size="md">
                          <Icon size={17} />
                        </ThemeIcon>
                        <Stack gap={0} align="flex-start">
                          <Text size="sm" fw={active ? 650 : 500}>
                            {t(`navigation.${section.id}`)}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {index + 1} / {sectionDefinitions.length}
                          </Text>
                        </Stack>
                      </Group>
                    </UnstyledButton>
                  );
                })}
              </Stack>
            </nav>

            <section id="onboarding-studio-section" className={classes.content} aria-labelledby="studio-section-title">
              <motion.div
                key={activeSection}
                initial={reduceMotion ? false : { x: 12 }}
                animate={{ x: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.18 }}
              >
                <StudioSectionContent section={activeSection} {...sectionProps} />
              </motion.div>

              {applyError ? (
                <Alert className={classes.applyError} color="red" title={t("review.errorTitle")} role="alert">
                  {applyError}
                </Alert>
              ) : null}

              <Group className={classes.stickyActions} justify="space-between" wrap="nowrap">
                <Button
                  className={classes.backAction}
                  size="md"
                  variant="default"
                  leftSection={<IconArrowLeft size={16} />}
                  aria-label={t("back")}
                  disabled={activeIndex === 0 || isApplying}
                  onClick={() => move(-1)}
                >
                  {t("back")}
                </Button>
                {activeSection === "review" ? (
                  <Button
                    size="md"
                    loading={isApplying}
                    rightSection={<IconSparkles size={16} />}
                    onClick={() => void applySetupAsync()}
                  >
                    {t("buildBoard")}
                  </Button>
                ) : (
                  <Group className={classes.primaryActions} gap="xs" wrap="nowrap">
                    {activeSection === "essentials" ? (
                      <Button
                        className={classes.fastAction}
                        size="md"
                        variant="subtle"
                        loading={isApplying}
                        onClick={() => void applySetupAsync(false)}
                      >
                        {t("buildBoard")}
                      </Button>
                    ) : null}
                    <Button
                      size="md"
                      disabled={isApplying}
                      rightSection={<IconArrowRight size={16} />}
                      onClick={() => move(1)}
                    >
                      {t("continue")}
                    </Button>
                  </Group>
                )}
              </Group>
            </section>
          </div>
        </Paper>
      </div>
    </main>
  );
};

interface StudioSectionProps {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  environment: OnboardingStudioProps["environment"];
  serverOrigin: string;
  setServerOrigin: (value: string) => void;
  urlMode: UrlTemplateMode;
  setUrlMode: (value: UrlTemplateMode) => void;
  analyticsEnabled: boolean;
  setAnalyticsEnabled: (value: boolean) => void;
  currentLocale: SupportedLanguage;
  changeLocale: (value: SupportedLanguage) => void;
  localePending: boolean;
  colorScheme: ColorScheme;
  setColorScheme: (value: ColorScheme) => void;
  docker: ReturnType<typeof clientApi.onboard.discoverDockerServices.useQuery>;
  dockerData: DockerDiscoveryData | undefined;
  selectedKinds: IntegrationKind[];
  setSelectedKinds: (value: IntegrationKind[]) => void;
  detectedKinds: Set<IntegrationKind>;
  drafts: IntegrationDraft[];
  updateDraft: (id: string, patch: Partial<IntegrationDraft>) => void;
  selectSecretOption: (draft: IntegrationDraft, option: number) => void;
  discoveredApps: DockerDiscoveryData["apps"];
  selectedAppIds: string[];
  setSelectedAppIds: (value: string[]) => void;
  boardName: string;
  setBoardName: (value: string) => void;
  selectedBoardId: string | null;
  setSelectedBoardId: (value: string | null) => void;
  primaryColor: string;
  setPrimaryColor: (value: string) => void;
  secondaryColor: string;
  setSecondaryColor: (value: string) => void;
  itemRadius: MantineSize;
  setItemRadius: (value: MantineSize) => void;
  layoutPreset: LayoutPreset;
  setLayoutPreset: (value: LayoutPreset) => void;
  leftSidebar: boolean;
  setLeftSidebar: (value: boolean) => void;
  rightSidebar: boolean;
  setRightSidebar: (value: boolean) => void;
  applyProgress: number;
  applyMessage: string;
  applyError: string | null;
  appError: string | null;
}

const StudioSectionContent = ({ section, ...props }: StudioSectionProps & { section: StudioSection }) => {
  switch (section) {
    case "essentials":
      return <Essentials {...props} />;
    case "discover":
      return <Discovery {...props} />;
    case "connect":
      return <Connections {...props} />;
    case "board":
      return <BoardBuilder {...props} />;
    case "extend":
      return <Extensions {...props} />;
    case "review":
      return <Review {...props} />;
  }
};

const SectionHeading = ({
  eyebrow,
  title,
  description,
  headingRef,
}: {
  eyebrow: string;
  title: string;
  description: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) => (
  <Stack gap={4} mb="xl">
    <Text size="xs" tt="uppercase" lts="0.12em" fw={700} c="dimmed">
      {eyebrow}
    </Text>
    <Title id="studio-section-title" ref={headingRef} order={2} tabIndex={-1}>
      {title}
    </Title>
    <Text c="dimmed" maw="60ch">
      {description}
    </Text>
  </Stack>
);

const Essentials = (props: StudioSectionProps) => {
  const t = useScopedI18n("init.studio.essentials");
  return (
    <Stack gap="lg">
      <SectionHeading
        headingRef={props.headingRef}
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <Select
          label={t("language")}
          data={supportedLanguages.map((locale) => ({
            value: locale,
            label: `${localeConfigurations[locale].name} · ${localeConfigurations[locale].translatedName}`,
          }))}
          value={props.currentLocale}
          onChange={(value) => value && props.changeLocale(value as SupportedLanguage)}
          rightSection={props.localePending ? <Loader size="xs" /> : undefined}
          searchable
          allowDeselect={false}
        />
        <SegmentedControl
          aria-label={t("theme")}
          value={props.colorScheme}
          onChange={(value) => props.setColorScheme(value as ColorScheme)}
          data={[
            { value: "auto", label: t("themeAuto") },
            { value: "light", label: t("themeLight") },
            { value: "dark", label: t("themeDark") },
          ]}
          fullWidth
        />
      </SimpleGrid>

      <Paper className={classes.sectionCard} radius="lg" p="lg">
        <Stack>
          <Group wrap="nowrap" align="flex-start">
            <ThemeIcon variant="light" size="lg">
              <IconServer size={20} />
            </ThemeIcon>
            <Stack gap={2}>
              <Text fw={650}>{t("serverTitle")}</Text>
              <Text size="sm" c="dimmed">
                {t("serverDescription")}
              </Text>
            </Stack>
          </Group>
          <TextInput
            label={t("serverOrigin")}
            description={t("serverOriginDescription")}
            placeholder="home.lan · 192.168.1.10 · https://homarr.example.com"
            value={props.serverOrigin}
            onChange={(event) => props.setServerOrigin(event.currentTarget.value)}
          />
          <SegmentedControl
            fullWidth
            value={props.urlMode}
            onChange={(value) => props.setUrlMode(value as UrlTemplateMode)}
            data={[
              { value: "hostPort", label: t("hostPort") },
              { value: "subdomain", label: t("subdomain") },
            ]}
          />
          {props.serverOrigin ? (
            <Code block>{buildIntegrationUrl("sonarr", props.serverOrigin, props.urlMode)}</Code>
          ) : null}
        </Stack>
      </Paper>

      <Switch
        checked={props.analyticsEnabled}
        onChange={(event) => props.setAnalyticsEnabled(event.currentTarget.checked)}
        label={t("analytics")}
        description={t("analyticsDescription")}
      />
    </Stack>
  );
};

const Discovery = (props: StudioSectionProps) => {
  const t = useScopedI18n("init.studio.discover");
  const dockerStatus = !props.environment.dockerConfigured
    ? "disabled"
    : props.docker.isPending
      ? "checking"
      : props.dockerData?.status === "success"
        ? "available"
        : props.dockerData?.status === "empty"
          ? "empty"
          : props.dockerData?.status === "partial"
            ? "partial"
            : "unavailable";

  return (
    <Stack gap="lg">
      <SectionHeading
        headingRef={props.headingRef}
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />
      <Stack gap="sm">
        <CapabilityRow
          icon={IconDatabase}
          title={t("database")}
          status="available"
          detail={props.environment.databaseDriver}
        />
        <CapabilityRow
          icon={IconBrandDocker}
          title={t("docker")}
          status={dockerStatus}
          detail={
            props.dockerData?.status === "success" || props.dockerData?.status === "partial"
              ? t("found", {
                  integrations: String(props.dockerData.integrations.length),
                  apps: String(props.dockerData.apps.length),
                })
              : t(`status.${dockerStatus}`)
          }
          action={
            props.environment.dockerConfigured ? (
              <ActionIcon
                size={44}
                variant="subtle"
                aria-label={t("retryDocker")}
                onClick={() => void props.docker.refetch()}
                loading={props.docker.isFetching}
              >
                <IconRefresh size={18} />
              </ActionIcon>
            ) : undefined
          }
        />
        <CapabilityRow
          icon={IconServer}
          title={t("kubernetes")}
          status={props.environment.kubernetesConfigured ? "available" : "disabled"}
          detail={t(props.environment.kubernetesConfigured ? "kubernetesAvailable" : "kubernetesDisabled")}
        />
        <CapabilityRow
          icon={IconSparkles}
          title={t("assistantWorkshop")}
          status={props.environment.workshopEnabled ? "available" : "unavailable"}
          detail={t(props.environment.workshopEnabled ? "workshopAvailable" : "workshopUnavailable")}
        />
      </Stack>

      {props.docker.error || props.dockerData?.status === "partial" || props.dockerData?.status === "unavailable" ? (
        <Alert color="orange" title={t("partialTitle")}>
          <Stack gap="xs">
            <Text size="sm">{t("partialDescription")}</Text>
            {props.dockerData?.hosts
              .filter((host) => host.status === "unavailable")
              .map((host) => (
                <Text key={host.host} size="sm">
                  <Text component="span" fw={650}>
                    {host.host}:
                  </Text>{" "}
                  {host.reason}
                </Text>
              ))}
          </Stack>
        </Alert>
      ) : null}

      <Alert variant="light" icon={<IconWorld size={18} />} title={t("platformTitle")}>
        {t("platformDescription")}
      </Alert>
    </Stack>
  );
};

type CapabilityStatus = "checking" | "available" | "partial" | "empty" | "disabled" | "unavailable";

const CapabilityRow = ({
  icon: Icon,
  title,
  status,
  detail,
  action,
}: {
  icon: typeof IconServer;
  title: string;
  status: CapabilityStatus;
  detail: string;
  action?: ReactNode;
}) => {
  const t = useScopedI18n("init.studio.discover.status");
  const color =
    status === "available"
      ? "green"
      : status === "checking"
        ? "blue"
        : status === "partial" || status === "empty"
          ? "yellow"
          : "gray";
  return (
    <Paper className={classes.sectionCard} radius="lg" p="md">
      <Group justify="space-between" wrap="nowrap">
        <Group wrap="nowrap" miw={0}>
          <ThemeIcon variant="light" color={color} size="lg">
            {status === "checking" ? <Loader size="sm" /> : <Icon size={20} />}
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
            {t(status)}
          </Badge>
          {action}
        </Group>
      </Group>
    </Paper>
  );
};

const Connections = (props: StudioSectionProps) => {
  const t = useScopedI18n("init.studio.connect");
  return (
    <Stack gap="xl">
      <SectionHeading
        headingRef={props.headingRef}
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />
      <IntegrationMultiSelectGrid
        selectedKinds={props.selectedKinds}
        onSelectionChange={props.setSelectedKinds}
        detectedKinds={props.detectedKinds}
        onboarding
      />

      {props.discoveredApps.length > 0 ? (
        <Fieldset legend={t("discoveredApps", { count: String(props.discoveredApps.length) })}>
          <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }}>
            {props.discoveredApps.map((app) => (
              <Checkbox.Card
                key={app.sourceId}
                value={app.sourceId}
                checked={props.selectedAppIds.includes(app.sourceId)}
                onChange={() =>
                  props.setSelectedAppIds(
                    props.selectedAppIds.includes(app.sourceId)
                      ? props.selectedAppIds.filter((id) => id !== app.sourceId)
                      : [...props.selectedAppIds, app.sourceId],
                  )
                }
                p="sm"
                radius="md"
              >
                <Group wrap="nowrap">
                  <Avatar src={app.iconUrl} size="sm" radius="sm">
                    {app.containerName.at(0)}
                  </Avatar>
                  <Stack gap={0} miw={0}>
                    <Text size="sm" fw={600} truncate>
                      {app.containerName}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {app.suggestedUrl || t("addressNeeded")}
                    </Text>
                  </Stack>
                </Group>
              </Checkbox.Card>
            ))}
          </SimpleGrid>
        </Fieldset>
      ) : null}
      {props.appError ? (
        <Alert color="red" role="alert">
          {props.appError}
        </Alert>
      ) : null}

      {props.drafts.length > 0 ? (
        <Accordion variant="separated" multiple defaultValue={props.drafts.slice(0, 1).map((draft) => draft.id)}>
          {props.drafts.map((draft) => (
            <IntegrationEditor
              key={draft.id}
              draft={draft}
              update={(patch) => props.updateDraft(draft.id, patch)}
              selectSecretOption={(option) => props.selectSecretOption(draft, option)}
            />
          ))}
        </Accordion>
      ) : (
        <Alert variant="light" icon={<IconPlugConnected size={18} />}>
          {t("empty")}
        </Alert>
      )}
    </Stack>
  );
};

const IntegrationEditor = ({
  draft,
  update,
  selectSecretOption,
}: {
  draft: IntegrationDraft;
  update: (patch: Partial<IntegrationDraft>) => void;
  selectSecretOption: (option: number) => void;
}) => {
  const t = useScopedI18n("init.studio.connect");
  const options = getAllSecretKindOptions(draft.kind);
  const apiKeyUrl = getIntegrationApiKeyUrl(draft.url, draft.kind);
  const documentationUrl = getIntegrationDocumentationUrl(draft.kind);
  return (
    <Accordion.Item value={draft.id}>
      <Accordion.Control icon={<IntegrationAvatar kind={draft.kind} size="sm" />}>
        <Group justify="space-between" wrap="nowrap" pr="sm">
          <Stack gap={0} miw={0}>
            <Text fw={650} truncate>
              {draft.name}
            </Text>
            <Text size="xs" c="dimmed">
              {getIntegrationName(draft.kind)} · {draft.source === "docker" ? t("dockerSource") : t("manualSource")}
            </Text>
          </Stack>
          {draft.saved ? <Badge color="green">{t("ready")}</Badge> : null}
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        <Stack>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label={t("name")}
              value={draft.name}
              onChange={(event) => update({ name: event.currentTarget.value, error: null })}
            />
            <TextInput
              label={t("url")}
              value={draft.url}
              onChange={(event) => update({ url: event.currentTarget.value, error: null })}
            />
          </SimpleGrid>
          {options.length > 1 ? (
            <SegmentedControl
              value={String(draft.secretOption)}
              onChange={(value) => selectSecretOption(Number(value))}
              data={options.map((secretKinds, index) => ({
                value: String(index),
                label: secretKinds.length === 0 ? t("noCredentials") : secretKinds.map(formatSecretKind).join(" + "),
              }))}
            />
          ) : null}
          {draft.secrets.map((secret, index) => (
            <PasswordInput
              key={secret.kind}
              label={formatSecretKind(secret.kind)}
              value={secret.value}
              onChange={(event) =>
                update({
                  error: null,
                  secrets: draft.secrets.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, value: event.currentTarget.value } : item,
                  ),
                })
              }
            />
          ))}
          {draft.secrets.length === 0 ? (
            <Text size="sm" c="dimmed">
              {t("noCredentialsDescription")}
            </Text>
          ) : null}
          {apiKeyUrl ? (
            <Anchor href={apiKeyUrl} target="_blank" rel="noopener noreferrer" size="sm">
              <Group gap={4}>
                <IconKey size={14} />
                {t("getApiKey")}
                <IconExternalLink size={14} />
              </Group>
            </Anchor>
          ) : null}
          {documentationUrl ? (
            <Anchor href={documentationUrl} target="_blank" rel="noopener noreferrer" size="sm">
              <Group gap={4}>
                <IconExternalLink size={14} />
                {t("openGuide")}
              </Group>
            </Anchor>
          ) : null}
          {draft.error ? <Alert color="red">{draft.error}</Alert> : null}
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
};

const formatSecretKind = (kind: IntegrationSecretKind) =>
  kind.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());

const BoardBuilder = (props: StudioSectionProps) => {
  const t = useScopedI18n("init.studio.board");
  const reduceMotion = useReducedMotion();
  return (
    <Stack gap="xl">
      <SectionHeading
        headingRef={props.headingRef}
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        <Stack>
          {props.environment.availableBoards.length > 1 ? (
            <Select
              label={t("target")}
              description={t("targetDescription")}
              placeholder={t("targetPlaceholder")}
              data={props.environment.availableBoards.map((board) => ({ value: board.id, label: board.name }))}
              value={props.selectedBoardId}
              onChange={(value) => {
                props.setSelectedBoardId(value);
                const board = props.environment.availableBoards.find((candidate) => candidate.id === value);
                if (board) props.setBoardName(board.name);
              }}
              allowDeselect={false}
              searchable
              withAsterisk
              error={props.selectedBoardId ? undefined : t("targetRequired")}
            />
          ) : null}
          <TextInput
            label={t("name")}
            description={t("nameDescription")}
            value={props.boardName}
            onChange={(event) => props.setBoardName(event.currentTarget.value.replace(/[^A-Za-z0-9-_]/g, ""))}
            withAsterisk
          />
          <SimpleGrid cols={2}>
            <ColorInput label={t("primaryColor")} value={props.primaryColor} onChange={props.setPrimaryColor} />
            <ColorInput label={t("secondaryColor")} value={props.secondaryColor} onChange={props.setSecondaryColor} />
          </SimpleGrid>
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              {t("radius")}
            </Text>
            <SegmentedControl
              fullWidth
              value={props.itemRadius}
              onChange={(value) => props.setItemRadius(value as MantineSize)}
              data={radiusValues.map((value) => ({ value, label: value.toUpperCase() }))}
            />
            <Group gap="xs" aria-hidden>
              {radiusValues.map((radius, index) => (
                <motion.div
                  key={radius}
                  animate={{
                    borderRadius: props.itemRadius === radius ? `var(--mantine-radius-${radius})` : "4px",
                    scale: reduceMotion ? 1 : props.itemRadius === radius ? 1.06 : 1,
                  }}
                  transition={{ duration: reduceMotion ? 0 : 0.18 }}
                  style={{
                    flex: 1,
                    height: 34,
                    background: index % 2 === 0 ? props.primaryColor : props.secondaryColor,
                    opacity: props.itemRadius === radius ? 1 : 0.28,
                  }}
                />
              ))}
            </Group>
          </Stack>
        </Stack>

        <Stack>
          <SegmentedControl
            fullWidth
            value={props.layoutPreset}
            onChange={(value) => props.setLayoutPreset(value as LayoutPreset)}
            data={[
              { value: "focused", label: t("layoutFocused") },
              { value: "balanced", label: t("layoutBalanced") },
              { value: "wide", label: t("layoutWide") },
            ]}
          />
          <BoardPreview
            ariaLabel={t("previewLabel")}
            primaryColor={props.primaryColor}
            secondaryColor={props.secondaryColor}
            itemRadius={props.itemRadius}
            leftSidebar={props.leftSidebar}
            rightSidebar={props.rightSidebar}
          />
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Switch
              checked={props.leftSidebar}
              onChange={(event) => props.setLeftSidebar(event.currentTarget.checked)}
              label={t("leftSidebar")}
            />
            <Switch
              checked={props.rightSidebar}
              onChange={(event) => props.setRightSidebar(event.currentTarget.checked)}
              label={t("rightSidebar")}
            />
          </SimpleGrid>
        </Stack>
      </SimpleGrid>

      <Divider label={t("widgetPrimer")} labelPosition="left" />
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <PrimerCard icon={IconApps} title={t("primerAppsTitle")} description={t("primerAppsDescription")} />
        <PrimerCard
          icon={IconPlugConnected}
          title={t("primerWidgetsTitle")}
          description={t("primerWidgetsDescription")}
        />
        <PrimerCard icon={IconTool} title={t("primerEditTitle")} description={t("primerEditDescription")} />
      </SimpleGrid>
    </Stack>
  );
};

const BoardPreview = ({
  ariaLabel,
  primaryColor,
  secondaryColor,
  itemRadius,
  leftSidebar,
  rightSidebar,
}: {
  ariaLabel: string;
  primaryColor: string;
  secondaryColor: string;
  itemRadius: MantineSize;
  leftSidebar: boolean;
  rightSidebar: boolean;
}) => {
  const reduceMotion = useReducedMotion();
  return (
    <figure
      className={classes.preview}
      aria-label={ariaLabel}
      style={
        {
          gridTemplateColumns: [leftSidebar ? "0.24fr" : null, "minmax(0, 1fr)", rightSidebar ? "0.24fr" : null]
            .filter(Boolean)
            .join(" "),
        } as CSSProperties
      }
    >
      {leftSidebar ? <div className={classes.previewLane} /> : null}
      <div className={classes.previewLane}>
        <div className={classes.previewTiles}>
          {Array.from({ length: 5 }, (_, index) => (
            <motion.div
              key={index}
              className={classes.previewTile}
              animate={reduceMotion ? undefined : { borderRadius: `var(--mantine-radius-${itemRadius})` }}
              style={{
                borderRadius: `var(--mantine-radius-${itemRadius})`,
                background: `linear-gradient(135deg, color-mix(in srgb, ${primaryColor} 45%, transparent), color-mix(in srgb, ${secondaryColor} 38%, transparent))`,
              }}
            />
          ))}
        </div>
      </div>
      {rightSidebar ? <div className={classes.previewLane} /> : null}
    </figure>
  );
};

const PrimerCard = ({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof IconApps;
  title: string;
  description: string;
}) => (
  <Paper className={classes.sectionCard} radius="lg" p="md">
    <Stack>
      <ThemeIcon variant="light" size="lg">
        <Icon size={20} />
      </ThemeIcon>
      <Stack gap={3}>
        <Text fw={650}>{title}</Text>
        <Text size="sm" c="dimmed">
          {description}
        </Text>
      </Stack>
    </Stack>
  </Paper>
);

const Extensions = (props: StudioSectionProps) => {
  const t = useScopedI18n("init.studio.extend");
  return (
    <Stack gap="lg">
      <SectionHeading
        headingRef={props.headingRef}
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />
      <Tabs defaultValue="assistant" variant="outline">
        <Tabs.List grow>
          <Tabs.Tab value="assistant" leftSection={<IconBrain size={16} />}>
            {t("assistant")}
          </Tabs.Tab>
          <Tabs.Tab value="workshop" leftSection={<IconSparkles size={16} />}>
            {t("workshop")}
          </Tabs.Tab>
          <Tabs.Tab value="mcp" leftSection={<IconCode size={16} />}>
            {t("mcp")}
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="assistant" pt="md">
          <AssistantSetup environment={props.environment} />
        </Tabs.Panel>
        <Tabs.Panel value="workshop" pt="md">
          <WorkshopSetup environment={props.environment} />
        </Tabs.Panel>
        <Tabs.Panel value="mcp" pt="md">
          <McpSetup environment={props.environment} />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

const AssistantSetup = ({ environment }: { environment: StudioSectionProps["environment"] }) => {
  const t = useScopedI18n("init.studio.extend.assistantSetup");
  const reduceMotion = useReducedMotion();
  const [provider, setProvider] = useState<AssistantProvider>("homarr");
  const [baseUrl, setBaseUrl] = useState<string>(assistantProviderPresets.homarr.baseUrl);
  const [apiKey, setApiKey] = useState("");
  const [modelId, setModelId] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [webSearch, setWebSearch] = useState(false);
  const configuration = clientApi.assistant.getAdminConfiguration.useQuery(undefined, {
    enabled: environment.canConfigurePrivileged,
    retry: false,
  });
  const models = clientApi.assistant.discoverModels.useQuery(undefined, {
    enabled: false,
    retry: false,
  });
  const updateConnection = clientApi.assistant.updateConnection.useMutation({
    async onSuccess() {
      await configuration.refetch();
      await models.refetch();
    },
  });
  const updateConfiguration = clientApi.assistant.updateConfiguration.useMutation({
    onSuccess() {
      showSuccessNotification({ title: t("savedTitle"), message: t("savedDescription") });
    },
    onError(error) {
      showErrorNotification({ title: t("errorTitle"), message: error.message });
    },
  });

  const preset = assistantProviderPresets[provider];
  const selectProvider = (value: string | null) => {
    if (!value || !assistantProviderIds.includes(value as AssistantProvider)) return;
    const next = value as AssistantProvider;
    setProvider(next);
    setBaseUrl(next === "homarr" ? environment.workshopApiUrl : assistantProviderPresets[next].baseUrl);
    setModelId("");
  };

  if (!environment.canConfigurePrivileged) {
    return (
      <Alert icon={<IconKey size={18} />} title={t("loginTitle")}>
        <Stack gap="sm">
          <Text size="sm">{t("loginDescription")}</Text>
          <Button component={Link} href="/auth/login?callbackUrl=/manage/assistant" variant="light" w="fit-content">
            {t("loginAction")}
          </Button>
        </Stack>
      </Alert>
    );
  }

  return (
    <Stack gap="md">
      <div className={classes.assistantStage}>
        <motion.div
          className={classes.assistantGlow}
          animate={reduceMotion ? undefined : { scale: [0.86, 1.14, 0.86], opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <Stack h="100%" justify="center" align="center" pos="relative" p="lg">
          <motion.div
            animate={reduceMotion ? undefined : { rotate: [0, 4, -4, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <ThemeIcon size={64} radius="xl" variant="light">
              <IconBrain size={30} />
            </ThemeIcon>
          </motion.div>
          <Text fw={700}>{t("title")}</Text>
          <Text size="sm" c="dimmed" ta="center" maw="34rem">
            {t("description")}
          </Text>
        </Stack>
      </div>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <Select
          label={t("provider")}
          value={provider}
          onChange={selectProvider}
          data={assistantProviderIds.map((value) => ({ value, label: value.replaceAll("-", " ") }))}
          allowDeselect={false}
        />
        <TextInput
          label={t("baseUrl")}
          value={baseUrl}
          onChange={(event) => setBaseUrl(event.currentTarget.value)}
          disabled={provider === "homarr"}
        />
      </SimpleGrid>
      {preset.requiresApiKey ? (
        <PasswordInput label={t("apiKey")} value={apiKey} onChange={(event) => setApiKey(event.currentTarget.value)} />
      ) : null}
      <Group>
        <Button
          variant="light"
          loading={updateConnection.isPending || models.isFetching}
          onClick={() =>
            updateConnection.mutate({
              provider,
              baseUrl,
              modelDiscoveryPath: preset.modelDiscoveryPath,
              apiKey: apiKey.trim() || undefined,
              clearApiKey: provider === "homarr",
              clearCustomHeaders: provider === "homarr",
            })
          }
        >
          {t("connect")}
        </Button>
        <Text size="sm" c="dimmed">
          {t("connectHint")}
        </Text>
      </Group>
      {models.error ? <Alert color="orange">{models.error.message}</Alert> : null}
      {updateConnection.error ? <Alert color="red">{updateConnection.error.message}</Alert> : null}
      <Select
        label={t("model")}
        searchable
        data={(models.data ?? []).map((model) => ({ value: model.id, label: model.name }))}
        value={modelId}
        onChange={(value) => setModelId(value ?? "")}
        placeholder={models.isFetching ? t("discovering") : t("modelPlaceholder")}
        disabled={models.isFetching}
      />
      <Group grow>
        <Switch checked={enabled} onChange={(event) => setEnabled(event.currentTarget.checked)} label={t("enable")} />
        <Switch
          checked={webSearch}
          onChange={(event) => setWebSearch(event.currentTarget.checked)}
          label={t("webSearch")}
          disabled={!assistantProviderCanUseOpenRouterServerTools(provider)}
        />
      </Group>
      <Group justify="space-between">
        <Anchor component={Link} href="/manage/assistant" size="sm">
          {t("advanced")}
        </Anchor>
        <Button
          disabled={!modelId}
          loading={updateConfiguration.isPending}
          onClick={() => updateConfiguration.mutate({ enabled, modelId, webSearchEnabled: webSearch })}
        >
          {t("save")}
        </Button>
      </Group>
    </Stack>
  );
};

const WorkshopSetup = ({ environment }: { environment: StudioSectionProps["environment"] }) => {
  const t = useScopedI18n("init.studio.extend.workshopSetup");
  return (
    <Stack>
      <Paper className={classes.sectionCard} radius="lg" p="xl">
        <Group wrap="nowrap" align="flex-start">
          <ThemeIcon variant="light" size={54} radius="lg">
            <IconSparkles size={26} />
          </ThemeIcon>
          <Stack gap="xs">
            <Group gap="xs">
              <Text fw={700} size="lg">
                {t("title")}
              </Text>
              <Badge color={environment.workshopEnabled ? "green" : "gray"} variant="light">
                {environment.workshopEnabled ? t("available") : t("unavailable")}
              </Badge>
            </Group>
            <Text c="dimmed">{t("description")}</Text>
            <SimpleGrid cols={{ base: 1, sm: 3 }} mt="sm">
              <WorkshopFeature title={t("discoverTitle")} description={t("discoverDescription")} />
              <WorkshopFeature title={t("installTitle")} description={t("installDescription")} />
              <WorkshopFeature title={t("publishTitle")} description={t("publishDescription")} />
            </SimpleGrid>
          </Stack>
        </Group>
      </Paper>
      <Group justify="flex-end">
        <Button
          component="a"
          href={environment.workshopUrl}
          target="_blank"
          rel="noopener noreferrer"
          rightSection={<IconExternalLink size={16} />}
        >
          {t("browse")}
        </Button>
      </Group>
    </Stack>
  );
};

const WorkshopFeature = ({ title, description }: { title: string; description: string }) => (
  <Stack gap={3}>
    <Text fw={650} size="sm">
      {title}
    </Text>
    <Text size="xs" c="dimmed">
      {description}
    </Text>
  </Stack>
);

const McpSetup = ({ environment }: { environment: StudioSectionProps["environment"] }) => {
  const t = useScopedI18n("init.studio.extend.mcpSetup");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const createKey = clientApi.apiKeys.create.useMutation({
    onSuccess(data) {
      setApiKey(data.apiKey);
    },
  });
  const config = JSON.stringify(
    {
      mcpServers: {
        homarr: {
          url: environment.mcpEndpoint,
          headers: { ApiKey: apiKey ?? "<your-api-key>" },
        },
      },
    },
    null,
    2,
  );
  return (
    <Stack>
      <Alert icon={<IconBrain size={18} />} title={t("title")}>
        {t("description")}
      </Alert>
      <TextInput label={t("endpoint")} value={environment.mcpEndpoint} readOnly />
      {environment.canConfigurePrivileged ? (
        apiKey ? (
          <Alert color="yellow" icon={<IconKey size={18} />} title={t("keyTitle")}>
            <Stack gap="xs">
              <Text size="sm">{t("keyDescription")}</Text>
              <Group wrap="nowrap">
                <Code style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{apiKey}</Code>
                <CopyButton value={apiKey}>
                  {({ copied, copy }) => (
                    <ActionIcon size={44} onClick={copy} aria-label={t("copyKey")} color={copied ? "green" : undefined}>
                      {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                    </ActionIcon>
                  )}
                </CopyButton>
              </Group>
            </Stack>
          </Alert>
        ) : (
          <Stack align="flex-start" gap="xs">
            <Button
              variant="light"
              leftSection={<IconKey size={16} />}
              loading={createKey.isPending}
              onClick={() => createKey.mutate()}
            >
              {t("createKey")}
            </Button>
            {createKey.error ? <Alert color="red">{createKey.error.message}</Alert> : null}
          </Stack>
        )
      ) : (
        <Alert color="yellow">{t("loginRequired")}</Alert>
      )}
      <Stack gap="xs">
        <Group justify="space-between">
          <Text fw={650} size="sm">
            {t("configuration")}
          </Text>
          <CopyButton value={config}>
            {({ copied, copy }) => (
              <Button
                variant="subtle"
                size="compact-sm"
                onClick={copy}
                leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              >
                {copied ? t("copied") : t("copy")}
              </Button>
            )}
          </CopyButton>
        </Group>
        <Code block>{config}</Code>
      </Stack>
      <Anchor component={Link} href="/manage/tools/api" size="sm">
        {t("advanced")}
      </Anchor>
    </Stack>
  );
};

const Review = (props: StudioSectionProps) => {
  const t = useScopedI18n("init.studio.review");
  const reduceMotion = useReducedMotion();
  const summary = [
    {
      icon: IconPalette,
      label: t("appearance"),
      value: `${props.currentLocale} · ${props.colorScheme} · ${props.itemRadius}`,
    },
    {
      icon: IconBrandDocker,
      label: t("services"),
      value: t("servicesValue", {
        integrations: String(props.drafts.length),
        apps: String(props.selectedAppIds.length),
      }),
    },
    { icon: IconLayoutDashboard, label: t("board"), value: props.boardName },
    { icon: IconDeviceMobile, label: t("layouts"), value: t("layoutsValue") },
  ];
  return (
    <Stack gap="lg">
      <SectionHeading
        headingRef={props.headingRef}
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
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
                <Text fw={650} truncate>
                  {value}
                </Text>
              </Stack>
            </Group>
          </Paper>
        ))}
      </SimpleGrid>
      <BoardPreview
        ariaLabel={t("previewLabel")}
        primaryColor={props.primaryColor}
        secondaryColor={props.secondaryColor}
        itemRadius={props.itemRadius}
        leftSidebar={props.leftSidebar}
        rightSidebar={props.rightSidebar}
      />
      <Alert icon={<IconSparkles size={18} />} title={t("automaticTitle")}>
        {t("automaticDescription")}
      </Alert>
      {props.applyProgress > 0 ? (
        <Paper withBorder radius="lg" p="md">
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" fw={650}>
                {props.applyMessage}
              </Text>
              <Text size="sm" c="dimmed">
                {props.applyProgress}%
              </Text>
            </Group>
            <Progress
              value={props.applyProgress}
              animated={!reduceMotion && props.applyProgress < 100}
              aria-label={props.applyMessage}
              aria-live="polite"
            />
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
};

const createDraft = ({
  id,
  sourceId,
  kind,
  name,
  url,
  source,
}: Pick<IntegrationDraft, "id" | "kind" | "name" | "url" | "source"> & {
  sourceId?: string;
}): IntegrationDraft => ({
  id,
  sourceId,
  kind,
  name,
  url,
  source,
  secretOption: 0,
  secrets: getAllSecretKindOptions(kind)[0].map((secretKind) => ({ kind: secretKind, value: "" })),
  saved: false,
  error: null,
});
