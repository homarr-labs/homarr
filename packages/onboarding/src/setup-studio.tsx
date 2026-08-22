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
  ColorSwatch,
  CopyButton,
  Fieldset,
  Group,
  Paper,
  PasswordInput,
  Popover,
  Progress,
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
import type { MantineSize } from "@mantine/core";
import {
  IconAdjustments,
  IconAlertCircle,
  IconApps,
  IconArrowLeft,
  IconArrowRight,
  IconBrandDocker,
  IconBorderRadius,
  IconCheck,
  IconCode,
  IconCopy,
  IconDatabase,
  IconDeviceMobile,
  IconExternalLink,
  IconInfoCircle,
  IconKey,
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
  IconX,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type { RouterOutputs } from "@homarr/api";
import { revalidatePathActionAsync } from "@homarr/common/client";
import type {
  ColorScheme,
  IntegrationKind,
  IntegrationSecretKind,
  UrlTemplateMode,
  WidgetKind,
} from "@homarr/definitions";
import {
  buildAppUrl,
  buildIntegrationUrl,
  getAllSecretKindOptions,
  getDefaultWidgetConfig,
  getIntegrationApiKeyUrl,
  getIntegrationDefaultUrl,
  getIntegrationDocumentationUrl,
  getIntegrationName,
  getWidgetKindsForIntegration,
  generalWidgets,
} from "@homarr/definitions";
import { showErrorNotification, showSuccessNotification, showWarningNotification } from "@homarr/notifications";
import type { SupportedLanguage } from "@homarr/translation";
import { useCurrentLocale, useI18n } from "@homarr/translation/client";
import { BoardColorInput, ColorSchemeCombobox, IntegrationAvatar, LanguageCombobox, Link } from "@homarr/ui";
import { IntegrationMultiSelectGrid } from "@homarr/ui/integration-select-grid";

import type { OnboardingStudioProps } from "./types";
import { getBoardValidationErrors } from "./board-validation";
import { OnboardingBackdrop } from "./onboarding-backdrop";
import { OnboardingWordmark } from "./onboarding-wordmark";
import { OnboardingFloatingControl, ServiceUrlTemplate } from "./service-url-template";
import { useOnboardingSounds } from "./use-onboarding-sounds";
import {
  normalizeServiceUrl,
  resolveDiscoveredAppUrl,
  resolveIntegrationDraftUrl,
  takeNewSourceIds,
} from "./discovery-selection";
import classes from "./onboarding-studio.module.css";

type StudioSection = "essentials" | "discover" | "connect" | "board" | "extend" | "review";
type LayoutPreset = "balanced" | "wide" | "focused";

const getLayoutPresetForColumnCount = (columnCount: number): LayoutPreset =>
  columnCount <= 8 ? "focused" : columnCount <= 10 ? "balanced" : "wide";

interface IntegrationDraft {
  id: string;
  sourceId?: string;
  kind: IntegrationKind;
  name: string;
  url: string;
  urlOverridden: boolean;
  source: "manual" | "docker";
  secretOption: number;
  secrets: { kind: IntegrationSecretKind; value: string }[];
}

const isIntegrationDraftComplete = (draft: IntegrationDraft) =>
  draft.url.trim().length > 0 && draft.secrets.every((secret) => secret.value.trim().length > 0);

type DockerDiscoveryData = RouterOutputs["onboard"]["discoverDockerServices"];
type RuntimeCapabilitiesQuery = Omit<
  ReturnType<typeof clientApi.onboard.detectRuntimeCapabilities.useQuery>,
  "data"
> & {
  data: RouterOutputs["onboard"]["detectRuntimeCapabilities"] | undefined;
};

const sectionDefinitions = [
  { id: "essentials", icon: IconAdjustments },
  { id: "discover", icon: IconSearch },
  { id: "connect", icon: IconPlugConnected },
  { id: "board", icon: IconLayoutDashboard },
  { id: "extend", icon: IconSparkles },
  { id: "review", icon: IconCheck },
] as const;

const radiusValues = ["xs", "sm", "md", "lg", "xl"] as const;
const initialPrimaryColor = "#fa5252";
const initialSecondaryColor = "#fd7e14";
const emptyDiscoveredIntegrations: DockerDiscoveryData["integrations"] = [];
const emptyDiscoveredApps: DockerDiscoveryData["apps"] = [];

export const SetupStudio = ({ environment, assistantConfiguration }: OnboardingStudioProps) => {
  const t = useI18n("init.studio");
  const tCommon = useI18n("common.action");
  const currentLocale = useCurrentLocale();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const sounds = useOnboardingSounds();
  const [activeSection, setActiveSection] = useState<StudioSection>("essentials");
  const [incompleteIntegrationConfirmationOpened, setIncompleteIntegrationConfirmationOpened] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState(currentLocale);
  const [serverOrigin, setServerOrigin] = useState(environment.serverOrigin);
  const [urlMode, setUrlMode] = useState<UrlTemplateMode>("hostPort");
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [selectedKinds, setSelectedKinds] = useState<IntegrationKind[]>([]);
  const [selectedIntegrationSourceIds, setSelectedIntegrationSourceIds] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<IntegrationDraft[]>([]);
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [appUrlOverrides, setAppUrlOverrides] = useState<Record<string, string>>({});
  const [appErrorSourceId, setAppErrorSourceId] = useState<string | null>(null);
  const initialBoard =
    environment.initialBoard ?? (environment.availableBoards.length === 1 ? environment.availableBoards[0] : null);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(initialBoard?.id ?? null);
  const [boardName, setBoardName] = useState(initialBoard?.name ?? "dashboard");
  const [primaryColor, setPrimaryColor] = useState(initialPrimaryColor);
  const [secondaryColor, setSecondaryColor] = useState(initialSecondaryColor);
  const [itemRadius, setItemRadius] = useState<MantineSize>("lg");
  const [columnCount, setColumnCount] = useState(10);
  const [leftSidebar, setLeftSidebar] = useState(false);
  const [rightSidebar, setRightSidebar] = useState(false);
  const [boardValidationAttempted, setBoardValidationAttempted] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState(0);
  const [applyMessage, setApplyMessage] = useState("");
  const [appError, setAppError] = useState<string | null>(null);
  const sectionHeadingRef = useRef<HTMLHeadingElement>(null);
  const sectionButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const initialSection = useRef(true);
  const focusSectionHeading = useRef(true);
  const seenIntegrationSourceIds = useRef(new Set<string>());
  const seenAppSourceIds = useRef(new Set<string>());

  const docker = clientApi.onboard.discoverDockerServices.useQuery(undefined, {
    enabled: environment.dockerConfigured,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const runtimeCapabilities = clientApi.onboard.detectRuntimeCapabilities.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const complete = clientApi.onboard.completeSetup.useMutation({
    onError(error) {
      showErrorNotification({ title: t("review.errorTitle"), message: error.message });
    },
  });
  const dockerData = docker.data;
  const discoveredIntegrations = dockerData?.integrations ?? emptyDiscoveredIntegrations;
  const discoveredApps = dockerData?.apps ?? emptyDiscoveredApps;
  const discoveredAppUrls = useMemo(
    () =>
      Object.fromEntries(
        discoveredApps.map((app) => [
          app.sourceId,
          resolveDiscoveredAppUrl(
            appUrlOverrides[app.sourceId],
            app.suggestedUrl,
            serverOrigin
              ? buildAppUrl(
                  app.detectedType ?? app.containerName,
                  serverOrigin,
                  urlMode,
                  app.publishedPort ?? undefined,
                )
              : null,
          ),
        ]),
      ),
    [appUrlOverrides, discoveredApps, serverOrigin, urlMode],
  );
  const detectedKinds = useMemo(
    () => new Set(discoveredIntegrations.map((integration) => integration.kind)),
    [discoveredIntegrations],
  );

  useEffect(() => {
    if (!docker.data) return;
    const newIntegrationSourceIds = takeNewSourceIds(
      discoveredIntegrations.map((integration) => integration.sourceId),
      seenIntegrationSourceIds.current,
    );
    if (newIntegrationSourceIds.length > 0) {
      setSelectedIntegrationSourceIds((current) => [...new Set([...current, ...newIntegrationSourceIds])]);
    }
    const newAppSourceIds = takeNewSourceIds(
      discoveredApps.map((application) => application.sourceId),
      seenAppSourceIds.current,
    );
    if (newAppSourceIds.length > 0) {
      setSelectedAppIds((current) => [...new Set([...current, ...newAppSourceIds])]);
    }
  }, [docker.data, discoveredApps, discoveredIntegrations]);

  useEffect(() => {
    setDrafts((current) => {
      const next: IntegrationDraft[] = [];
      const existing = new Map(current.map((draft) => [draft.id, draft]));
      for (const discovered of discoveredIntegrations) {
        if (!selectedIntegrationSourceIds.includes(discovered.sourceId)) continue;
        const id = discovered.sourceId;
        const existingDraft = existing.get(id);
        const generatedUrl = resolveIntegrationDraftUrl({
          currentUrl: existingDraft?.url ?? "",
          overridden: existingDraft?.urlOverridden ?? false,
          serverUrl: serverOrigin
            ? buildIntegrationUrl(discovered.kind, serverOrigin, urlMode, discovered.publishedPort ?? undefined)
            : null,
          fallbackUrl: discovered.suggestedUrl,
        });
        next.push(
          existingDraft
            ? { ...existingDraft, url: generatedUrl }
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
        const id = `manual:${kind}`;
        const existingDraft = existing.get(id);
        const generatedUrl = resolveIntegrationDraftUrl({
          currentUrl: existingDraft?.url ?? "",
          overridden: existingDraft?.urlOverridden ?? false,
          serverUrl: serverOrigin ? buildIntegrationUrl(kind, serverOrigin, urlMode) : null,
          fallbackUrl: getIntegrationDefaultUrl(kind) ?? null,
        });
        next.push(
          existingDraft
            ? { ...existingDraft, url: generatedUrl }
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
  }, [discoveredIntegrations, selectedIntegrationSourceIds, selectedKinds, serverOrigin, urlMode]);

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
    if (section !== activeSection) sounds.swoosh();
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
    sectionButtonRefs.current[nextIndex]?.focus();
  };

  const updateDraft = (id: string, patch: Partial<IntegrationDraft>) => {
    setDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));
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

  const applySetupAsync = async () => {
    if (isApplying) return;
    setIsApplying(true);
    setAppError(null);
    setAppErrorSourceId(null);
    setApplyProgress(5);
    setBoardValidationAttempted(true);
    try {
      if (!selectedBoardId && environment.availableBoards.length > 0) {
        setActiveSection("board");
        throw new Error(t("board.targetRequired"));
      }
      if (!boardName.trim()) {
        setActiveSection("board");
        throw new Error(t("board.nameDescription"));
      }
      const draftsToApply = drafts.filter(isIntegrationDraftComplete);
      const appsToCreate = discoveredApps.filter((app) => selectedAppIds.includes(app.sourceId));
      const appWithoutAddress = appsToCreate.find((app) => (discoveredAppUrls[app.sourceId] ?? "").trim().length === 0);
      if (appWithoutAddress) {
        const message = t("connect.appAddressRequired", { name: appWithoutAddress.containerName });
        setAppError(message);
        setAppErrorSourceId(appWithoutAddress.sourceId);
        setActiveSection("connect");
        throw new Error(message);
      }

      setApplyMessage(t("review.progress.applying"));
      setApplyProgress(20);
      await new Promise((resolve) => setTimeout(resolve, 300));
      const selectedSourceIds = new Set(draftsToApply.flatMap((draft) => (draft.sourceId ? [draft.sourceId] : [])));
      const completion = await complete.mutateAsync({
        server: {
          defaultLocale: selectedLocale,
          defaultColorScheme: colorScheme as ColorScheme,
          analyticsEnabled,
        },
        board: {
          id: selectedBoardId ?? undefined,
          name: boardName,
          primaryColor,
          secondaryColor,
          itemRadius,
          layoutPreset: getLayoutPresetForColumnCount(columnCount),
          columnCount,
          leftSidebar,
          rightSidebar,
        },
        integrations: draftsToApply.map((draft) => {
          const discovered = draft.sourceId
            ? discoveredIntegrations.find((integration) => integration.sourceId === draft.sourceId)
            : undefined;
          return {
            sourceId: draft.sourceId ?? draft.id,
            name: draft.name,
            url: normalizeServiceUrl(draft.url) ?? draft.url,
            kind: draft.kind,
            secrets: draft.secrets,
            iconUrl: discovered?.iconUrl ?? null,
            description: discovered?.description ?? null,
            pingUrl: discovered?.pingUrl ?? null,
          };
        }),
        apps: appsToCreate.flatMap((app) => {
          const enteredAddress = (discoveredAppUrls[app.sourceId] ?? "").trim();
          const href = normalizeServiceUrl(enteredAddress) ?? enteredAddress;
          return href
            ? [
                {
                  sourceId: app.sourceId,
                  name: app.containerName,
                  href,
                  pingUrl: app.pingUrl ?? null,
                  iconUrl: app.iconUrl,
                  description: app.description ?? null,
                },
              ]
            : [];
        }),
        selectedIntegrationIds: [],
        selectedAppIds: [],
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
              ...generalWidgets,
              ...discoveredIntegrations.filter((integration) => selectedSourceIds.has(integration.sourceId)),
              ...appsToCreate,
            ].flatMap((selection) =>
              typeof selection === "string" ? [selection] : selection.widgetKind ? [selection.widgetKind] : [],
            ),
          ),
        ],
      });
      const dockerWarningCount =
        completion.docker.missingSourceIds.length +
        completion.docker.ignoredSourceIds.length +
        completion.docker.skippedWidgets.length;
      if (dockerWarningCount > 0) {
        sounds.warning();
        showWarningNotification({
          title: t("review.dockerWarningTitle"),
          message: t("review.dockerWarningDescription", { count: dockerWarningCount }),
        });
      } else sounds.success();
      setApplyMessage(t("review.progress.done"));
      setApplyProgress(100);
      await revalidatePathActionAsync("/init");
    } catch {
      sounds.error();
      setApplyProgress(0);
      setIsApplying(false);
    }
  };

  const sectionProps: StudioSectionProps = {
    headingRef: sectionHeadingRef,
    environment,
    assistantConfiguration,
    serverOrigin,
    setServerOrigin,
    urlMode,
    setUrlMode,
    analyticsEnabled,
    setAnalyticsEnabled: (value) => {
      sounds.toggle(value);
      setAnalyticsEnabled(value);
    },
    selectedLocale,
    setSelectedLocale: (value) => {
      sounds.click();
      setSelectedLocale(value);
    },
    colorScheme: colorScheme as ColorScheme,
    setColorScheme,
    docker,
    dockerData,
    runtimeCapabilities,
    selectedKinds,
    setSelectedKinds: (value) => {
      sounds.click();
      setSelectedKinds(value);
    },
    discoveredIntegrations,
    selectedIntegrationSourceIds,
    setSelectedIntegrationSourceIds: (value) => {
      sounds.click();
      setSelectedIntegrationSourceIds(value);
    },
    detectedKinds,
    drafts,
    updateDraft,
    selectSecretOption,
    discoveredApps,
    discoveredAppUrls,
    setDiscoveredAppUrl: (sourceId, url) => {
      setAppUrlOverrides((current) => ({ ...current, [sourceId]: url }));
      if (appErrorSourceId === sourceId) {
        setAppErrorSourceId(null);
        setAppError(null);
      }
    },
    selectedAppIds,
    setSelectedAppIds: (value) => {
      sounds.click();
      setSelectedAppIds(value);
    },
    boardName,
    setBoardName,
    selectedBoardId,
    boardValidationAttempted,
    setSelectedBoardId: (value) => {
      sounds.click();
      setSelectedBoardId(value);
    },
    primaryColor,
    setPrimaryColor,
    secondaryColor,
    setSecondaryColor,
    itemRadius,
    setItemRadius,
    columnCount,
    setColumnCount,
    leftSidebar,
    setLeftSidebar: (value) => {
      sounds.toggle(value);
      setLeftSidebar(value);
    },
    rightSidebar,
    setRightSidebar: (value) => {
      sounds.toggle(value);
      setRightSidebar(value);
    },
    applyProgress,
    applyMessage,
    appError,
    appErrorSourceId,
  };
  const hasIncompleteIntegrations = drafts.some((draft) => !isIntegrationDraftComplete(draft));
  const selectedAppWithoutAddress = discoveredApps.find(
    (app) => selectedAppIds.includes(app.sourceId) && (discoveredAppUrls[app.sourceId] ?? "").trim().length === 0,
  );
  const continueDisabled = isApplying || (activeSection === "essentials" && serverOrigin.trim().length === 0);
  const continueOnboarding = () => {
    if (continueDisabled) return;
    if (activeSection === "review") {
      void applySetupAsync();
    } else if (activeSection === "connect") {
      if (selectedAppWithoutAddress) {
        setAppError(t("connect.appAddressRequired", { name: selectedAppWithoutAddress.containerName }));
        setAppErrorSourceId(selectedAppWithoutAddress.sourceId);
        return;
      }
      setAppError(null);
      setAppErrorSourceId(null);
      if (hasIncompleteIntegrations) {
        setIncompleteIntegrationConfirmationOpened(true);
      } else {
        move(1);
      }
    } else {
      move(1);
    }
  };
  return (
    <main
      className={classes.page}
      style={
        {
          "--studio-glow-color": primaryColor,
          "--studio-secondary-glow-color": secondaryColor,
        } as CSSProperties
      }
    >
      <OnboardingBackdrop />
      <div className={classes.shell}>
        <Group className={classes.topbar} justify="center" mb="lg">
          <OnboardingWordmark
            primaryColor={primaryColor}
            secondaryColor={secondaryColor.toLowerCase() === initialSecondaryColor ? undefined : secondaryColor}
          />
        </Group>

        <Paper className={classes.studio} radius="lg">
          <div className={classes.studioGrid}>
            <nav className={classes.rail} aria-label={t("navigationLabel")}>
              <Timeline
                active={activeIndex}
                bulletSize={32}
                lineWidth={2}
                color={primaryColor}
                className={classes.timeline}
                classNames={{ itemBullet: classes.timelineBullet }}
              >
                {sectionDefinitions.map((section, index) => {
                  const Icon = section.icon;
                  const active = section.id === activeSection;
                  return (
                    <Timeline.Item
                      key={section.id}
                      bullet={<Icon size={16} aria-hidden />}
                      title={
                        <UnstyledButton
                          ref={(node) => {
                            sectionButtonRefs.current[index] = node;
                          }}
                          className={classes.timelineButton}
                          data-active={active}
                          onClick={() => selectSection(section.id)}
                          onKeyDown={(event) => handleSectionKeyDown(event, index)}
                          aria-label={`${t(`navigation.${section.id}`)} (${index + 1}/${sectionDefinitions.length})`}
                          aria-current={active ? "step" : undefined}
                          aria-controls="onboarding-studio-section"
                          tabIndex={active ? 0 : -1}
                        >
                          <Stack gap={0} align="flex-start">
                            <Text className={classes.timelineLabel} size="sm" fw={active ? 650 : 500}>
                              {t(`navigation.${section.id}`)}
                            </Text>
                            <Text className={classes.timelineLabel} size="xs" c="dimmed">
                              {index + 1} / {sectionDefinitions.length}
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
              <div key={activeSection}>
                <StudioSectionContent section={activeSection} {...sectionProps} />
              </div>

              <Group className={classes.stickyActions} justify="space-between" wrap="nowrap">
                <Button
                  className={classes.backAction}
                  size="sm"
                  variant="default"
                  leftSection={<IconArrowLeft size={16} />}
                  aria-label={t("back")}
                  disabled={activeIndex === 0 || isApplying}
                  onClick={() => move(-1)}
                >
                  {t("back")}
                </Button>
                {activeSection === "review" ? (
                  <Button size="sm" loading={isApplying} onClick={continueOnboarding}>
                    {t("buildBoard")}
                  </Button>
                ) : (
                  <Group className={classes.primaryActions} gap="xs" wrap="nowrap">
                    {activeSection === "connect" && hasIncompleteIntegrations ? (
                      <Popover
                        opened={incompleteIntegrationConfirmationOpened}
                        onDismiss={() => setIncompleteIntegrationConfirmationOpened(false)}
                        transitionProps={{ duration: 0 }}
                        position="top-end"
                        width={320}
                        shadow="md"
                        withArrow
                        trapFocus
                      >
                        <Popover.Target>
                          <Button
                            size="sm"
                            disabled={continueDisabled}
                            rightSection={<IconArrowRight size={16} />}
                            aria-haspopup="dialog"
                            aria-expanded={incompleteIntegrationConfirmationOpened}
                            onClick={() => setIncompleteIntegrationConfirmationOpened((opened) => !opened)}
                          >
                            {tCommon("continue")}
                          </Button>
                        </Popover.Target>
                        <Popover.Dropdown role="dialog" aria-label={t("connect.incompleteConfirmation")}>
                          <Stack gap="sm">
                            <Text size="sm">{t("connect.incompleteConfirmation")}</Text>
                            <Group justify="flex-end" gap="xs">
                              <Button
                                size="xs"
                                variant="default"
                                onClick={() => setIncompleteIntegrationConfirmationOpened(false)}
                              >
                                {tCommon("cancel")}
                              </Button>
                              <Button
                                size="xs"
                                onClick={() => {
                                  setIncompleteIntegrationConfirmationOpened(false);
                                  move(1);
                                }}
                              >
                                {tCommon("confirm")}
                              </Button>
                            </Group>
                          </Stack>
                        </Popover.Dropdown>
                      </Popover>
                    ) : (
                      <Button
                        size="sm"
                        disabled={continueDisabled}
                        rightSection={<IconArrowRight size={16} />}
                        onClick={continueOnboarding}
                      >
                        {tCommon("continue")}
                      </Button>
                    )}
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
  assistantConfiguration: ReactNode;
  serverOrigin: string;
  setServerOrigin: (value: string) => void;
  urlMode: UrlTemplateMode;
  setUrlMode: (value: UrlTemplateMode) => void;
  analyticsEnabled: boolean;
  setAnalyticsEnabled: (value: boolean) => void;
  selectedLocale: SupportedLanguage;
  setSelectedLocale: (value: SupportedLanguage) => void;
  colorScheme: ColorScheme;
  setColorScheme: (value: ColorScheme) => void;
  docker: ReturnType<typeof clientApi.onboard.discoverDockerServices.useQuery>;
  dockerData: DockerDiscoveryData | undefined;
  runtimeCapabilities: RuntimeCapabilitiesQuery;
  selectedKinds: IntegrationKind[];
  setSelectedKinds: (value: IntegrationKind[]) => void;
  discoveredIntegrations: DockerDiscoveryData["integrations"];
  selectedIntegrationSourceIds: string[];
  setSelectedIntegrationSourceIds: (value: string[]) => void;
  detectedKinds: Set<IntegrationKind>;
  drafts: IntegrationDraft[];
  updateDraft: (id: string, patch: Partial<IntegrationDraft>) => void;
  selectSecretOption: (draft: IntegrationDraft, option: number) => void;
  discoveredApps: DockerDiscoveryData["apps"];
  discoveredAppUrls: Record<string, string>;
  setDiscoveredAppUrl: (sourceId: string, url: string) => void;
  selectedAppIds: string[];
  setSelectedAppIds: (value: string[]) => void;
  boardName: string;
  setBoardName: (value: string) => void;
  selectedBoardId: string | null;
  boardValidationAttempted: boolean;
  setSelectedBoardId: (value: string | null) => void;
  primaryColor: string;
  setPrimaryColor: (value: string) => void;
  secondaryColor: string;
  setSecondaryColor: (value: string) => void;
  itemRadius: MantineSize;
  setItemRadius: (value: MantineSize) => void;
  columnCount: number;
  setColumnCount: (value: number) => void;
  leftSidebar: boolean;
  setLeftSidebar: (value: boolean) => void;
  rightSidebar: boolean;
  setRightSidebar: (value: boolean) => void;
  applyProgress: number;
  applyMessage: string;
  appError: string | null;
  appErrorSourceId: string | null;
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
  title,
  description,
  headingRef,
}: {
  title: string;
  description: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) => (
  <Stack gap={4} mb="xl">
    <Title id="studio-section-title" ref={headingRef} order={2} tabIndex={-1}>
      {title}
    </Title>
    <Text c="dimmed" maw="60ch">
      {description}
    </Text>
  </Stack>
);

const Essentials = (props: StudioSectionProps) => {
  const t = useI18n("init.studio.essentials");
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => setIsHydrated(true), []);
  return (
    <Stack gap="lg">
      <SectionHeading headingRef={props.headingRef} title={t("title")} description={t("description")} />
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <LanguageCombobox
          label={t("language")}
          value={props.selectedLocale}
          onChange={props.setSelectedLocale}
          width="100%"
        />
        <ColorSchemeCombobox
          label={t("theme")}
          value={props.colorScheme}
          onChange={props.setColorScheme}
          width="100%"
        />
      </SimpleGrid>

      <Stack gap="sm">
        <Alert variant="light" icon={<IconInfoCircle size={18} />} my="xs">
          {t("serverOriginHelp")}
        </Alert>
        <ServiceUrlTemplate
          serverOrigin={props.serverOrigin}
          onServerOriginChange={props.setServerOrigin}
          mode={props.urlMode}
          onModeChange={props.setUrlMode}
          readOnly={!isHydrated}
          required
        />
        {props.serverOrigin ? (
          <Code block>{buildIntegrationUrl("sonarr", props.serverOrigin, props.urlMode)}</Code>
        ) : null}
      </Stack>

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
  const t = useI18n("init.studio.discover");
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
  const kubernetesStatus: CapabilityStatus = !props.environment.kubernetesConfigured
    ? "disabled"
    : props.runtimeCapabilities.isPending
      ? "checking"
      : props.runtimeCapabilities.data?.kubernetes.status === "available"
        ? "available"
        : "unavailable";
  const workshopStatus: CapabilityStatus = props.runtimeCapabilities.isPending
    ? "checking"
    : props.runtimeCapabilities.data?.workshop.status === "available"
      ? "available"
      : "unavailable";
  const kubernetesVersion =
    props.runtimeCapabilities.data?.kubernetes.status === "available"
      ? props.runtimeCapabilities.data.kubernetes.detail
      : undefined;

  const runtimeRetryAction = (label: string) => (
    <ActionIcon
      size={44}
      variant="subtle"
      aria-label={label}
      onClick={() => void props.runtimeCapabilities.refetch()}
      loading={props.runtimeCapabilities.isFetching}
    >
      <IconRefresh size={18} />
    </ActionIcon>
  );

  return (
    <Stack gap="lg">
      <SectionHeading headingRef={props.headingRef} title={t("title")} description={t("description")} />
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
        />
        <CapabilityRow
          icon={IconServer}
          title={t("kubernetes")}
          status={kubernetesStatus}
          detail={
            kubernetesStatus === "checking"
              ? t("status.checking")
              : kubernetesStatus === "available"
                ? t("kubernetesAvailable", {
                    version: kubernetesVersion ?? t("unknownVersion"),
                  })
                : t(kubernetesStatus === "disabled" ? "kubernetesDisabled" : "kubernetesUnavailable")
          }
          action={props.environment.kubernetesConfigured ? runtimeRetryAction(t("retryKubernetes")) : undefined}
        />
        <CapabilityRow
          icon={IconSparkles}
          title={t("assistantWorkshop")}
          status={workshopStatus}
          detail={
            workshopStatus === "checking"
              ? t("status.checking")
              : t(workshopStatus === "available" ? "workshopAvailable" : "workshopUnavailable")
          }
          action={runtimeRetryAction(t("retryWorkshop"))}
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
  const t = useI18n("init.studio.discover.status");
  const color =
    status === "available"
      ? "green"
      : status === "checking"
        ? "blue"
        : status === "partial" || status === "empty"
          ? "yellow"
          : "gray";
  return (
    <Paper
      component="output"
      className={classes.sectionCard}
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
            {t(status)}
          </Badge>
          {action}
        </Group>
      </Group>
    </Paper>
  );
};

const Connections = (props: StudioSectionProps) => {
  const t = useI18n("init.studio.connect");
  return (
    <Stack gap="xl">
      <SectionHeading headingRef={props.headingRef} title={t("title")} description={t("description")} />
      {props.discoveredIntegrations.length > 0 ? (
        <Fieldset legend={t("discoveredIntegrations", { count: String(props.discoveredIntegrations.length) })}>
          <Checkbox.Group value={props.selectedIntegrationSourceIds} onChange={props.setSelectedIntegrationSourceIds}>
            <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }}>
              {props.discoveredIntegrations.map((integration) => (
                <Checkbox.Card
                  className={classes.discoveryChoice}
                  key={integration.sourceId}
                  value={integration.sourceId}
                  aria-label={t("detectedIntegrationLabel", {
                    name: integration.containerName,
                    kind: getIntegrationName(integration.kind),
                  })}
                  p="sm"
                  radius="md"
                >
                  <Group wrap="nowrap">
                    <Checkbox.Indicator />
                    <IntegrationAvatar kind={integration.kind} size="sm" radius="sm" />
                    <Stack gap={0} miw={0}>
                      <Text size="sm" fw={600} truncate>
                        {integration.containerName}
                      </Text>
                      <Text size="xs" c="dimmed" truncate>
                        {getIntegrationName(integration.kind)}
                      </Text>
                    </Stack>
                  </Group>
                </Checkbox.Card>
              ))}
            </SimpleGrid>
          </Checkbox.Group>
        </Fieldset>
      ) : null}

      {props.discoveredApps.length > 0 ? (
        <Fieldset legend={t("discoveredApps", { count: String(props.discoveredApps.length) })}>
          <SimpleGrid className={classes.detectedAppGrid} cols={{ base: 1, xs: 2, md: 3 }}>
            {props.discoveredApps.map((app) => {
              const selected = props.selectedAppIds.includes(app.sourceId);
              return (
                <div className={classes.detectedAppItem} key={app.sourceId}>
                  <Checkbox.Card
                    className={classes.discoveryChoice}
                    value={app.sourceId}
                    checked={selected}
                    aria-label={t("detectedAppLabel", { name: app.containerName })}
                    onChange={() =>
                      props.setSelectedAppIds(
                        selected
                          ? props.selectedAppIds.filter((id) => id !== app.sourceId)
                          : [...props.selectedAppIds, app.sourceId],
                      )
                    }
                    p="sm"
                    radius="md"
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
                  {selected ? (
                    <TextInput
                      label={t("url")}
                      value={props.discoveredAppUrls[app.sourceId] ?? ""}
                      onChange={(event) => props.setDiscoveredAppUrl(app.sourceId, event.currentTarget.value)}
                      error={props.appErrorSourceId === app.sourceId ? props.appError : undefined}
                      placeholder="service.local:8080"
                      required
                    />
                  ) : null}
                </div>
              );
            })}
          </SimpleGrid>
        </Fieldset>
      ) : null}

      {props.appError ? (
        <Alert color="red" role="alert">
          {props.appError}
        </Alert>
      ) : null}

      <Fieldset legend={t("otherIntegrations")}>
        <IntegrationMultiSelectGrid
          selectedKinds={props.selectedKinds}
          onSelectionChange={props.setSelectedKinds}
          detectedKinds={props.detectedKinds}
          onboarding
        />
      </Fieldset>

      <Fieldset legend={t("configureIntegrations")}>
        {props.drafts.length > 0 ? (
          <Accordion
            className={classes.integrationAccordion}
            variant="separated"
            multiple
            transitionDuration={200}
            order={3}
            defaultValue={props.drafts.slice(0, 1).map((draft) => draft.id)}
          >
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
      </Fieldset>
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
  const t = useI18n("init.studio.connect");
  const tCommon = useI18n("common.field");
  const sounds = useOnboardingSounds();
  const options = getAllSecretKindOptions(draft.kind);
  const apiKeyUrl = getIntegrationApiKeyUrl(draft.url, draft.kind);
  const documentationUrl = getIntegrationDocumentationUrl(draft.kind);
  const needsConfiguration = !isIntegrationDraftComplete(draft);
  const testConnection = clientApi.onboard.testIntegration.useMutation({
    onSuccess(result) {
      if (result.success) {
        sounds.success();
        showSuccessNotification({ title: t("testSuccess"), message: t("testSuccessDescription") });
      } else {
        sounds.error();
        showErrorNotification({ title: t("testError"), message: t("testErrorDescription") });
      }
    },
    onError() {
      sounds.error();
      showErrorNotification({ title: t("testError"), message: t("testErrorDescription") });
    },
  });
  const updateAndResetTest = (patch: Partial<IntegrationDraft>) => {
    testConnection.reset();
    update(patch);
  };
  const testFailed = testConnection.data?.success === false || testConnection.isError;
  const testSucceeded = testConnection.data?.success === true;
  const status = needsConfiguration
    ? { color: "orange", label: t("needsConfiguration"), icon: <IconAlertCircle size={14} /> }
    : testSucceeded
      ? { color: "green", label: t("tested"), icon: <IconCheck size={14} /> }
      : testFailed
        ? { color: "red", label: t("testFailed"), icon: <IconX size={14} /> }
        : { color: "gray", label: t("testConnection"), icon: <IconPlugConnected size={14} /> };
  return (
    <Accordion.Item value={draft.id}>
      <Accordion.Control
        icon={<IntegrationAvatar kind={draft.kind} size="sm" />}
        aria-label={`${draft.name}: ${status.label}`}
      >
        <Group justify="space-between" wrap="nowrap" pr="sm">
          <Stack gap={0} miw={0}>
            <Text fw={650} truncate>
              {draft.name}
            </Text>
            <Text size="xs" c="dimmed">
              {getIntegrationName(draft.kind)} · {draft.source === "docker" ? t("dockerSource") : t("manualSource")}
            </Text>
          </Stack>
          <ThemeIcon
            className={classes.integrationStatus}
            color={status.color}
            variant="light"
            size="sm"
            radius="xl"
            aria-label={status.label}
          >
            {status.icon}
          </ThemeIcon>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        <Stack>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label={tCommon("name")}
              value={draft.name}
              onChange={(event) => updateAndResetTest({ name: event.currentTarget.value })}
            />
            <TextInput
              label={t("url")}
              value={draft.url}
              onChange={(event) => updateAndResetTest({ url: event.currentTarget.value, urlOverridden: true })}
            />
          </SimpleGrid>
          {options.length > 1 ? (
            <OnboardingFloatingControl
              ariaLabel={t("credentialMethod")}
              value={String(draft.secretOption)}
              onChange={(value) => {
                testConnection.reset();
                selectSecretOption(Number(value));
              }}
              options={options.map((secretKinds, index) => ({
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
                updateAndResetTest({
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
          <Group justify="space-between" align="center" wrap="wrap">
            {documentationUrl ? (
              <Anchor href={documentationUrl} target="_blank" rel="noopener noreferrer" size="sm">
                <Group gap={4}>
                  <IconExternalLink size={14} />
                  {t("openGuide")}
                </Group>
              </Anchor>
            ) : (
              <span />
            )}
            <Button
              variant="default"
              size="xs"
              disabled={needsConfiguration}
              loading={testConnection.isPending}
              color={testSucceeded ? "green" : testFailed ? "red" : undefined}
              leftSection={
                testSucceeded ? (
                  <IconCheck size={14} />
                ) : testFailed ? (
                  <IconX size={14} />
                ) : (
                  <IconPlugConnected size={14} />
                )
              }
              onClick={() => {
                sounds.click();
                testConnection.mutate({
                  sourceId: draft.sourceId ?? draft.id,
                  name: draft.name,
                  url: normalizeServiceUrl(draft.url) ?? draft.url,
                  kind: draft.kind,
                  secrets: draft.secrets,
                });
              }}
            >
              {t("testConnection")}
            </Button>
          </Group>
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
};

const formatSecretKind = (kind: IntegrationSecretKind) =>
  kind.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());

const BoardBuilder = (props: StudioSectionProps) => {
  const t = useI18n("init.studio.board");
  const sounds = useOnboardingSounds();
  const validationErrors = getBoardValidationErrors({
    attempted: props.boardValidationAttempted,
    hasExistingBoards: props.environment.availableBoards.length > 0,
    selectedBoardId: props.selectedBoardId,
    boardName: props.boardName,
  });
  const previewWidgetKinds = getPreviewWidgetKinds(props);
  const previewAppCount = getPreviewAppCount(props);
  const colorsCustomized =
    props.primaryColor.toLowerCase() !== initialPrimaryColor ||
    props.secondaryColor.toLowerCase() !== initialSecondaryColor;
  return (
    <Stack gap="xl">
      <SectionHeading headingRef={props.headingRef} title={t("title")} description={t("description")} />
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
              error={validationErrors.target ? t("targetRequired") : undefined}
            />
          ) : null}
          <TextInput
            label={t("name")}
            description={t("nameDescription")}
            value={props.boardName}
            onChange={(event) => props.setBoardName(event.currentTarget.value.replace(/[^A-Za-z0-9-_]/g, ""))}
            withAsterisk
            error={validationErrors.name ? t("nameRequired") : undefined}
          />
          <Stack gap="xs">
            <SimpleGrid cols={2}>
              <BoardColorInput
                label={t("primaryColor")}
                value={props.primaryColor}
                onChange={props.setPrimaryColor}
                defaultColor={initialPrimaryColor}
              />
              <BoardColorInput
                label={t("secondaryColor")}
                value={props.secondaryColor}
                onChange={props.setSecondaryColor}
                defaultColor={initialSecondaryColor}
              />
            </SimpleGrid>
            {colorsCustomized ? (
              <Button
                variant="subtle"
                size="compact-sm"
                leftSection={<IconRefresh size={14} />}
                onClick={() => {
                  sounds.pop();
                  props.setPrimaryColor(initialPrimaryColor);
                  props.setSecondaryColor(initialSecondaryColor);
                }}
                w="fit-content"
              >
                {t("resetColors")}
              </Button>
            ) : null}
          </Stack>
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              {t("radius")}
            </Text>
            <OnboardingFloatingControl
              ariaLabel={t("radius")}
              value={props.itemRadius}
              onChange={props.setItemRadius}
              options={radiusValues.map((value) => ({ value, label: value.toUpperCase() }))}
            />
            <Group gap="xs" aria-hidden>
              {radiusValues.map((radius) => (
                <div
                  key={radius}
                  style={{
                    flex: 1,
                    height: 34,
                    borderRadius: `var(--mantine-radius-${radius})`,
                    background: "var(--mantine-color-default)",
                    border: "1px solid var(--mantine-color-default-border)",
                    opacity: props.itemRadius === radius ? 1 : 0.55,
                  }}
                />
              ))}
            </Group>
          </Stack>
        </Stack>

        <Stack gap="lg">
          <Stack gap="xs" pb="md">
            <Group justify="space-between" align="flex-start">
              <Stack gap={2}>
                <Text size="sm" fw={500}>
                  {t("columns")}
                </Text>
                <Text size="xs" c="dimmed" maw="44ch">
                  {t("columnsDescription")}
                </Text>
              </Stack>
              <Badge variant="light">{t("columnCount", { count: props.columnCount })}</Badge>
            </Group>
            <Slider
              mt="xs"
              min={8}
              max={24}
              step={1}
              value={props.columnCount}
              onChange={props.setColumnCount}
              marks={[8, 10, 12, 18, 24].map((value) => ({ value, label: String(value) }))}
              thumbLabel={t("columns")}
              thumbValueText={(value) => t("columnCount", { count: value })}
              label={(value) => t("columnCount", { count: value })}
            />
          </Stack>
          <BoardPreview
            ariaLabel={t("previewLabel")}
            itemRadius={props.itemRadius}
            baseColumnCount={props.columnCount}
            leftSidebar={props.leftSidebar}
            rightSidebar={props.rightSidebar}
            widgetKinds={previewWidgetKinds}
            appCount={previewAppCount}
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
    </Stack>
  );
};

const BoardPreview = ({
  ariaLabel,
  itemRadius,
  baseColumnCount,
  leftSidebar,
  rightSidebar,
  widgetKinds,
  appCount,
}: {
  ariaLabel: string;
  itemRadius: MantineSize;
  baseColumnCount: number;
  leftSidebar: boolean;
  rightSidebar: boolean;
  widgetKinds: WidgetKind[];
  appCount: number;
}) => {
  const columnCount = Math.max(1, baseColumnCount - Number(leftSidebar) - Number(rightSidebar));
  const previewItems = [
    ...widgetKinds.map((kind) => {
      const config = getDefaultWidgetConfig(kind);
      return { id: `widget:${kind}`, width: config.width, height: config.height };
    }),
    ...Array.from({ length: appCount }, (_, index) => ({ id: `app:${index}`, width: 1, height: 1 })),
  ].slice(0, 12);

  return (
    <figure
      className={classes.preview}
      aria-label={ariaLabel}
      data-layout-role="base"
      data-layout-columns={columnCount}
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
        <div className={classes.previewTiles} style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}>
          {previewItems.map((item) => (
            <div
              key={item.id}
              className={classes.previewTile}
              aria-hidden
              style={{
                gridColumn: `span ${Math.min(columnCount, item.width)}`,
                gridRow: `span ${Math.min(3, item.height)}`,
                borderRadius: `var(--mantine-radius-${itemRadius})`,
              }}
            />
          ))}
        </div>
      </div>
      {rightSidebar ? <div className={classes.previewLane} /> : null}
    </figure>
  );
};

const Extensions = (props: StudioSectionProps) => {
  const t = useI18n("init.studio.extend");
  return (
    <Stack gap={0}>
      <Title id="studio-section-title" ref={props.headingRef} order={2} tabIndex={-1} mb="xs">
        {t("title")}
      </Title>
      <Tabs defaultValue="workshop">
        <Tabs.List grow aria-label={t("tabsLabel")}>
          <Tabs.Tab value="workshop" leftSection={<IconSparkles size={16} />}>
            {t("workshop")}
          </Tabs.Tab>
          <Tabs.Tab value="assistant" leftSection={<IconRobot size={16} />}>
            {t("assistant")}
          </Tabs.Tab>
          <Tabs.Tab value="mcp" leftSection={<IconCode size={16} />}>
            MCP
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="workshop" pt="xs">
          <WorkshopSetup environment={props.environment} runtimeCapabilities={props.runtimeCapabilities} />
        </Tabs.Panel>
        <Tabs.Panel value="assistant" pt="xs">
          <AssistantSetup environment={props.environment} configuration={props.assistantConfiguration} />
        </Tabs.Panel>
        <Tabs.Panel value="mcp" pt="xs">
          <McpSetup environment={props.environment} />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
};

const AssistantSetup = ({
  environment,
  configuration,
}: {
  environment: StudioSectionProps["environment"];
  configuration: ReactNode;
}) => {
  const t = useI18n("init.studio.extend.assistantSetup");
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

  return configuration;
};

const WorkshopSetup = ({
  environment,
  runtimeCapabilities,
}: {
  environment: StudioSectionProps["environment"];
  runtimeCapabilities: StudioSectionProps["runtimeCapabilities"];
}) => {
  const t = useI18n("init.studio.extend.workshopSetup");
  const status = runtimeCapabilities.isPending
    ? "checking"
    : runtimeCapabilities.data?.workshop.status === "available"
      ? "available"
      : "unavailable";
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
              <Badge color={status === "available" ? "green" : status === "checking" ? "blue" : "gray"} variant="light">
                {t(status)}
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
  const t = useI18n("init.studio.extend.mcpSetup");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const sounds = useOnboardingSounds();
  const createKey = clientApi.apiKeys.create.useMutation({
    onSuccess(data) {
      sounds.success();
      setApiKey(data.apiKey);
    },
    onError(error) {
      sounds.error();
      showErrorNotification({ title: t("errorTitle"), message: error.message });
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
      <Alert icon={<IconCode size={18} />} title={t("title")} my="xs">
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
                    <ActionIcon
                      size={44}
                      onClick={() => {
                        sounds.pop();
                        copy();
                      }}
                      aria-label={t("copyKey")}
                      color={copied ? "green" : undefined}
                    >
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
              onClick={() => {
                sounds.click();
                createKey.mutate();
              }}
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
                onClick={() => {
                  sounds.pop();
                  copy();
                }}
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
  const t = useI18n("init.studio.review");
  const themeLabel = {
    auto: t("themeAuto"),
    light: t("themeLight"),
    dark: t("themeDark"),
  }[props.colorScheme];
  const sidebarCount = Number(props.leftSidebar) + Number(props.rightSidebar);
  const summary = [
    {
      icon: IconLayoutDashboard,
      label: t("board"),
      value: props.boardName,
    },
    {
      icon: IconLayoutColumns,
      label: t("columns"),
      value: t("columnsValue", { count: props.columnCount }),
    },
    {
      icon: IconLayoutSidebar,
      label: t("sidebars"),
      value: t("sidebarsValue", { count: sidebarCount }),
    },
    { icon: IconDeviceMobile, label: t("layouts"), value: t("layoutsValue") },
    {
      icon: IconPlugConnected,
      label: t("integrations"),
      value: t("integrationsValue", { count: props.drafts.filter(isIntegrationDraftComplete).length }),
    },
    {
      icon: IconApps,
      label: t("apps"),
      value: t("appsValue", { count: getPreviewAppCount(props) }),
    },
    { icon: IconLanguage, label: t("language"), value: props.selectedLocale },
    { icon: IconSunMoon, label: t("theme"), value: themeLabel },
    {
      icon: IconPalette,
      label: t("colors"),
      value: (
        <Group gap="xs" wrap="nowrap">
          <ColorSwatch color={props.primaryColor} size={18} />
          <Text size="sm" fw={650} ff="monospace">
            {props.primaryColor}
          </Text>
          <ColorSwatch color={props.secondaryColor} size={18} />
          <Text size="sm" fw={650} ff="monospace">
            {props.secondaryColor}
          </Text>
        </Group>
      ),
    },
    { icon: IconBorderRadius, label: t("radius"), value: props.itemRadius.toUpperCase() },
  ];
  return (
    <Stack gap="lg">
      <SectionHeading headingRef={props.headingRef} title={t("title")} description={t("description")} />
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
      <Alert icon={<IconSparkles size={18} />} title={t("automaticTitle")} my="xs">
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
            <Progress value={props.applyProgress} aria-label={props.applyMessage} aria-live="polite" />
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
};

const getPreviewWidgetKinds = (props: StudioSectionProps) => [
  ...new Set([
    ...generalWidgets,
    ...props.drafts.filter(isIntegrationDraftComplete).flatMap((draft) => getWidgetKindsForIntegration(draft.kind)),
    ...props.discoveredApps
      .filter((app) => props.selectedAppIds.includes(app.sourceId))
      .flatMap((app) => (app.widgetKind ? [app.widgetKind] : [])),
  ]),
];

const getPreviewAppCount = (props: StudioSectionProps) =>
  props.drafts.filter(isIntegrationDraftComplete).length +
  props.discoveredApps.filter((app) => props.selectedAppIds.includes(app.sourceId)).length;

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
  urlOverridden: false,
  source,
  secretOption: 0,
  secrets: (getAllSecretKindOptions(kind)[0] ?? []).map((secretKind) => ({ kind: secretKind, value: "" })),
});
