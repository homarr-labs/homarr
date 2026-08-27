"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  Accordion,
  ActionIcon,
  Alert,
  Autocomplete,
  Avatar,
  Badge,
  Button,
  Collapse,
  Divider,
  Group,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import {
  IconAlertTriangle,
  IconApps,
  IconCheck,
  IconChevronDown,
  IconEye,
  IconEyeOff,
  IconBrandDocker,
  IconMinus,
  IconPlugConnected,
  IconRefresh,
  IconSettings,
} from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import type { UrlTemplateMode } from "@homarr/definitions";
import { getIntegrationName, invariantTechnicalLabels } from "@homarr/definitions";
import { useModalAction } from "@homarr/modals";
import { AddDockerAppToHomarr } from "@homarr/modals-collection";
import { showErrorNotification } from "@homarr/notifications";
import { normalizeServiceUrl, ServiceUrlTemplate } from "@homarr/onboarding";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import { IntegrationSelectModal } from "~/components/integration/integration-select-modal";
import type { DockerReconciliationInboxFilter } from "./docker-reconciliation-inbox";
import {
  dismissDockerReconciliationCandidate,
  filterDockerReconciliationInbox,
  getTemplateUrl,
} from "./docker-reconciliation-inbox";

type ReconciliationCandidate = RouterOutputs["docker"]["reconcileServices"]["candidates"][number];
type ServiceHealth = RouterOutputs["docker"]["getServiceHealth"]["services"][number];

export const DockerReconciliation = ({ defaultServerOrigin }: { defaultServerOrigin: string }) => {
  const t = useI18n("docker.reconciliation");
  const tCommon = useI18n("common");
  const tDockerAction = useI18n("docker.action");
  const utils = clientApi.useUtils();
  const panelId = useId();
  const [isOpen, setIsOpen] = useLocalStorage({
    key: "homarr-docker-reconciliation-open",
    defaultValue: false,
  });
  const reconciliation = clientApi.docker.reconcileServices.useQuery();
  const health = clientApi.docker.getServiceHealth.useQuery(undefined, { enabled: isOpen });
  const refreshInventory = clientApi.docker.refreshInventory.useMutation({
    async onSuccess() {
      await Promise.all([
        utils.docker.getContainers.invalidate(),
        utils.docker.reconcileServices.invalidate(),
        utils.docker.getServiceHealth.invalidate(),
      ]);
    },
    onError() {
      showErrorNotification({
        title: tDockerAction("refresh.notification.error.title"),
        message: tDockerAction("refresh.notification.error.message"),
      });
    },
  });
  const [filter, setFilter] = useState<DockerReconciliationInboxFilter>("attention");
  const [dismissedCandidateKeys, setDismissedCandidateKeys] = useLocalStorage<string[]>({
    key: "homarr-docker-reconciliation-dismissed",
    defaultValue: [],
  });
  const [serverOrigin, setServerOrigin] = useLocalStorage({
    key: "homarr-docker-service-origin",
    defaultValue: defaultServerOrigin,
  });
  const [urlMode, setUrlMode] = useLocalStorage<UrlTemplateMode>({
    key: "homarr-docker-service-url-mode",
    defaultValue: "hostPort",
  });

  if (reconciliation.isError) {
    return (
      <Alert color="red" icon={<IconAlertTriangle size={16} />} title={t("loadError.title")}>
        <Stack gap="sm">
          <Text size="sm">{t("loadError.message")}</Text>
          <Button variant="light" color="red" size="xs" w="fit-content" onClick={() => void reconciliation.refetch()}>
            {tCommon("action.tryAgain")}
          </Button>
        </Stack>
      </Alert>
    );
  }

  if (!reconciliation.data) return null;

  const unavailableEndpoints = reconciliation.data.endpoints.filter(({ status }) => status === "unavailable");
  const candidates = filterDockerReconciliationInbox(reconciliation.data.candidates, filter, dismissedCandidateKeys);
  const attentionCount = reconciliation.data.candidates.filter(
    ({ candidateKey, state }) =>
      ["newRecognized", "newApp", "moved"].includes(state) && !dismissedCandidateKeys.includes(candidateKey),
  ).length;
  const isRefreshing = refreshInventory.isPending || reconciliation.isFetching || health.isFetching;
  const toggleLabel = isOpen ? tCommon("action.hide") : t("action.review");

  return (
    <Paper withBorder p="sm">
      <Stack gap={isOpen ? "sm" : 0}>
        <Group justify="space-between" align="start">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <ThemeIcon variant="light" size="lg" radius="md">
              <IconBrandDocker size={18} />
            </ThemeIcon>
            <div>
              <Group gap="xs">
                <Text fw={600}>{t("title")}</Text>
                <Badge variant="light" color={attentionCount > 0 ? "blue" : "gray"} aria-live="polite">
                  {t("suggestions", { count: String(attentionCount) })}
                </Badge>
              </Group>
            </div>
          </Group>
          <Button
            variant="subtle"
            size="compact-sm"
            rightSection={
              <IconChevronDown
                size={15}
                style={{ transform: isOpen ? "rotate(180deg)" : undefined, transition: "transform 150ms ease" }}
              />
            }
            aria-expanded={isOpen}
            aria-controls={panelId}
            onClick={() => setIsOpen((current) => !current)}
          >
            {toggleLabel}
          </Button>
        </Group>

        <Collapse id={panelId} expanded={isOpen}>
          <Divider mb="sm" />
          <Stack gap="sm">
            <ServiceUrlTemplate
              serverOrigin={serverOrigin}
              onServerOriginChange={setServerOrigin}
              mode={urlMode}
              onModeChange={setUrlMode}
            />

            <Group justify="space-between">
              <SegmentedControl
                size="xs"
                value={filter}
                onChange={(value) => setFilter(value as DockerReconciliationInboxFilter)}
                data={[
                  { value: "attention", label: t("filter.attention") },
                  { value: "represented", label: t("filter.represented") },
                  { value: "all", label: t("filter.all") },
                ]}
              />
              <Group gap="xs">
                {dismissedCandidateKeys.length > 0 && (
                  <Button variant="subtle" size="compact-xs" onClick={() => setDismissedCandidateKeys([])}>
                    {t("action.restoreDismissed", { count: String(dismissedCandidateKeys.length) })}
                  </Button>
                )}
                <Button
                  variant="light"
                  size="compact-xs"
                  loading={isRefreshing}
                  leftSection={<IconRefresh size={14} />}
                  onClick={() => refreshInventory.mutate()}
                >
                  {tCommon("action.refresh")}
                </Button>
              </Group>
            </Group>

            {unavailableEndpoints.length > 0 && (
              <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
                {t("endpointUnavailable", { names: unavailableEndpoints.map(({ name }) => name).join(", ") })}
              </Alert>
            )}

            {candidates.length === 0 ? (
              <Text c="dimmed" size="sm">
                {reconciliation.data.candidates.length === 0 ? t("empty") : t("emptyFilter")}
              </Text>
            ) : (
              <Accordion multiple variant="separated" radius="sm" chevron={null}>
                {candidates.map((candidate) => (
                  <DockerReconciliationCandidate
                    key={candidate.candidateKey}
                    candidate={candidate}
                    health={health.data?.services.find(({ key }) => key === candidate.candidateKey)}
                    serverOrigin={serverOrigin}
                    urlMode={urlMode}
                    onDismiss={() =>
                      setDismissedCandidateKeys((current) =>
                        dismissDockerReconciliationCandidate(current, candidate.candidateKey),
                      )
                    }
                  />
                ))}
              </Accordion>
            )}
          </Stack>
        </Collapse>
      </Stack>
    </Paper>
  );
};

const DockerReconciliationCandidate = ({
  candidate,
  health,
  serverOrigin,
  urlMode,
  onDismiss,
}: {
  candidate: ReconciliationCandidate;
  health: ServiceHealth | undefined;
  serverOrigin: string;
  urlMode: UrlTemplateMode;
  onDismiss: () => void;
}) => {
  const t = useI18n("docker.reconciliation");
  const tIntegration = useI18n("integration");
  const { openModal: openAppModal } = useModalAction(AddDockerAppToHomarr);
  const { openModal: openIntegrationModal } = useModalAction(IntegrationSelectModal);
  const templateUrl = getTemplateUrl(candidate, serverOrigin, urlMode);
  const urlSuggestions = Array.from(
    new Set([templateUrl, ...candidate.urlCandidates.map(({ url }) => url)].filter((url) => url.length > 0)),
  );
  const initialUrl = urlSuggestions[0] ?? "";
  const [url, setUrl] = useState(initialUrl);
  const isUrlEdited = useRef(false);
  const target = getCandidateTarget(candidate);
  const actionNeedsUrl = target.kind === "createApp" || target.kind === "setupIntegration";
  const visibleHealthLayers =
    health?.layers.filter(({ status }) => status !== "notApplicable" && status !== "notObserved") ?? [];

  useEffect(() => {
    if (isUrlEdited.current) return;
    setUrl(initialUrl);
  }, [initialUrl]);

  return (
    <Accordion.Item value={candidate.candidateKey}>
      <Group wrap="nowrap" gap={4} pr="sm">
        <Accordion.Control
          style={{ flex: 1 }}
          icon={
            <Avatar src={candidate.container.iconUrl} radius="sm" size="sm">
              {candidate.container.name.at(0)?.toUpperCase()}
            </Avatar>
          }
        >
          <div style={{ minWidth: 0 }}>
            <Group gap="xs" wrap="nowrap">
              <Text fw={600} size="sm" truncate>
                {candidate.container.name}
              </Text>
              <Badge color={stateColor(candidate.state)} variant="light" size="xs">
                {t(`state.${candidate.state}`)}
              </Badge>
            </Group>
            <Text c="dimmed" size="xs">
              {candidate.endpointName}
            </Text>
          </div>
        </Accordion.Control>
        <Group gap={4} wrap="nowrap">
          {target.kind === "createApp" && (
            <Button
              variant="light"
              size="compact-xs"
              leftSection={<IconApps size={14} />}
              onClick={() =>
                openAppModal({
                  selectedContainers: [candidate.container],
                  initialUrls: [(normalizeServiceUrl(url) ?? url) || null],
                })
              }
            >
              {tIntegration("field.createApp.label")}
            </Button>
          )}
          {target.kind === "setupIntegration" && (
            <Button
              variant="light"
              size="compact-xs"
              leftSection={<IconPlugConnected size={14} />}
              onClick={() =>
                openIntegrationModal({
                  initialKind: target.integrationKind,
                  initialName: candidate.container.name,
                  initialUrl: normalizeServiceUrl(url) ?? url,
                })
              }
            >
              {t("action.setupIntegration")}
            </Button>
          )}
          {(target.kind === "reviewIntegration" || target.kind === "viewRepresentation") && (
            <Button
              component={Link}
              href={target.href}
              variant="light"
              size="compact-xs"
              leftSection={target.kind === "reviewIntegration" ? <IconSettings size={14} /> : <IconEye size={14} />}
            >
              {t(`action.${target.kind}`)}
            </Button>
          )}
          <Tooltip label={t("action.dismiss")} events={{ hover: true, focus: true, touch: false }}>
            <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t("action.dismiss")} onClick={onDismiss}>
              <IconEyeOff size={15} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <Accordion.Panel>
        <Stack gap="sm">
          {candidate.representation.signals.ambiguous && (
            <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
              {t("ambiguous")}
            </Alert>
          )}

          {visibleHealthLayers.length > 0 && (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xs">
              {visibleHealthLayers.map((layer) => (
                <Group key={layer.layer} gap="xs" wrap="nowrap">
                  <HealthStatusIcon status={layer.status} />
                  <Text size="xs">
                    {t(`health.layer.${layer.layer}`)} ·{" "}
                    <Text component="span" c="dimmed" inherit>
                      {t(`health.status.${layer.status}`)}
                    </Text>
                  </Text>
                </Group>
              ))}
            </SimpleGrid>
          )}

          {actionNeedsUrl && (
            <Autocomplete
              label={invariantTechnicalLabels.url}
              value={url}
              data={urlSuggestions}
              placeholder={t("url.manual")}
              onChange={(value) => {
                isUrlEdited.current = true;
                setUrl(value);
              }}
            />
          )}
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
};

const getCandidateTarget = (candidate: ReconciliationCandidate) => {
  if (candidate.representation.signals.ambiguous) {
    if (candidate.nextAction === "reviewIntegration" && candidate.match) {
      const params = new URLSearchParams({ search: getIntegrationName(candidate.match.kind) });
      return { kind: "reviewIntegration" as const, href: `/manage/integrations?${params.toString()}` };
    }
    return { kind: "viewRepresentation" as const, href: "/manage/apps" };
  }
  if (candidate.state === "newRecognized" && candidate.match) {
    return { kind: "setupIntegration" as const, integrationKind: candidate.match.kind };
  }

  if (candidate.state === "newApp") return { kind: "createApp" as const };
  if (candidate.representation.integration) {
    return {
      kind: candidate.state === "moved" ? ("reviewIntegration" as const) : ("viewRepresentation" as const),
      href: `/manage/integrations/edit/${candidate.representation.integration.id}`,
    };
  }
  if (candidate.representation.app) {
    return { kind: "viewRepresentation" as const, href: `/manage/apps/edit/${candidate.representation.app.id}` };
  }

  return { kind: "createApp" as const };
};

const stateColor = (state: ReconciliationCandidate["state"]) => {
  if (state === "linked" || state === "represented") return "green";
  if (state === "moved") return "yellow";
  return "blue";
};

const HealthStatusIcon = ({ status }: { status: ServiceHealth["layers"][number]["status"] }) => {
  let color = "gray";
  let icon = <IconMinus size={12} />;

  if (["available", "configured", "linked"].includes(status)) {
    color = "green";
    icon = <IconCheck size={12} />;
  } else if (["missing", "changed", "unused"].includes(status)) {
    color = "yellow";
    icon = <IconAlertTriangle size={12} />;
  }

  return (
    <ThemeIcon color={color} variant="light" radius="xl" size="sm">
      {icon}
    </ThemeIcon>
  );
};
