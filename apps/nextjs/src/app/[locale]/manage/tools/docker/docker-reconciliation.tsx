"use client";

import { useEffect, useId, useState } from "react";
import {
  Accordion,
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Button,
  Collapse,
  Divider,
  Group,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconChevronDown,
  IconEyeOff,
  IconRefresh,
  IconSparkles,
} from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { getIntegrationName } from "@homarr/definitions";
import { useModalAction } from "@homarr/modals";
import { AddDockerAppToHomarr } from "@homarr/modals-collection";
import { showErrorNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import type { DockerReconciliationInboxFilter } from "./docker-reconciliation-inbox";
import {
  dismissDockerReconciliationCandidate,
  filterDockerReconciliationInbox,
  getValidDockerServiceUrl,
} from "./docker-reconciliation-inbox";

type ReconciliationCandidate = RouterOutputs["docker"]["reconcileServices"]["candidates"][number];
type ServiceHealth = RouterOutputs["docker"]["getServiceHealth"]["services"][number];

export const DockerReconciliation = () => {
  const t = useScopedI18n("docker.reconciliation");
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
        title: t("refreshError.title"),
        message: t("refreshError.message"),
      });
    },
  });
  const [filter, setFilter] = useState<DockerReconciliationInboxFilter>("attention");
  const [dismissedCandidateKeys, setDismissedCandidateKeys] = useLocalStorage<string[]>({
    key: "homarr-docker-reconciliation-dismissed",
    defaultValue: [],
  });

  if (reconciliation.isError) {
    return (
      <Alert color="red" icon={<IconAlertTriangle size={16} />} title={t("loadError.title")}>
        <Stack gap="sm">
          <Text size="sm">{t("loadError.message")}</Text>
          <Button variant="light" color="red" size="xs" w="fit-content" onClick={() => void reconciliation.refetch()}>
            {t("action.retry")}
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
  const toggleLabel = isOpen ? t("action.hide") : t("action.review");

  return (
    <Paper withBorder p="sm">
      <Stack gap={isOpen ? "sm" : 0}>
        <Group justify="space-between" align="start">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <ThemeIcon variant="light" size="lg" radius="md">
              <IconSparkles size={18} />
            </ThemeIcon>
            <div>
              <Group gap="xs">
                <Text fw={600}>{t("title")}</Text>
                <Badge variant="light" color={attentionCount > 0 ? "blue" : "gray"} aria-live="polite">
                  {t("suggestions", { count: String(attentionCount) })}
                </Badge>
              </Group>
              <Text c="dimmed" size="sm">
                {t("description")}
              </Text>
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
                  {t("action.refresh")}
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
              <Accordion multiple variant="separated" radius="sm" chevronPosition="left">
                {candidates.map((candidate) => (
                  <DockerReconciliationCandidate
                    key={candidate.candidateKey}
                    candidate={candidate}
                    health={health.data?.services.find(({ key }) => key === candidate.candidateKey)}
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
  onDismiss,
}: {
  candidate: ReconciliationCandidate;
  health: ServiceHealth | undefined;
  onDismiss: () => void;
}) => {
  const t = useScopedI18n("docker.reconciliation");
  const { openModal } = useModalAction(AddDockerAppToHomarr);
  const initialUrlCandidate =
    candidate.urlCandidates.find(
      ({ url, scopes }) => url.length > 0 && (candidate.match ? true : scopes.includes("browser")),
    ) ?? candidate.urlCandidates.find(({ source }) => source === "manual");
  const [selectedCandidateId, setSelectedCandidateId] = useState(initialUrlCandidate?.id ?? null);
  const [url, setUrl] = useState(initialUrlCandidate?.url ?? "");
  const selectedCandidate = candidate.urlCandidates.find(({ id }) => id === selectedCandidateId);
  const validatedUrl = getValidDockerServiceUrl(url);
  const isInvalidUrl = url.length > 0 && validatedUrl === null;
  const target = getCandidateTarget(candidate, validatedUrl ?? "");
  const actionNeedsUrl = target.kind === "createApp" || target.kind === "setupIntegration";
  const isActionDisabled = actionNeedsUrl && validatedUrl === null;

  useEffect(() => {
    setSelectedCandidateId(initialUrlCandidate?.id ?? null);
    setUrl(initialUrlCandidate?.url ?? "");
  }, [initialUrlCandidate?.id, initialUrlCandidate?.url]);

  return (
    <Accordion.Item value={candidate.candidateKey}>
      <Group wrap="nowrap" gap={4} pr="sm">
        <Accordion.Control style={{ flex: 1 }}>
          <Group wrap="nowrap" style={{ minWidth: 0 }}>
            <Avatar src={candidate.container.iconUrl} radius="sm" size="sm">
              {candidate.container.name.at(0)?.toUpperCase()}
            </Avatar>
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
          </Group>
        </Accordion.Control>
        <Group gap={4} wrap="nowrap">
          {target.kind === "createApp" ? (
            <Button
              variant="light"
              size="compact-xs"
              rightSection={<IconArrowRight size={14} />}
              disabled={isActionDisabled}
              onClick={() =>
                openModal({
                  selectedContainers: [candidate.container],
                  initialUrls: validatedUrl ? [validatedUrl] : undefined,
                })
              }
            >
              {t("action.createApp")}
            </Button>
          ) : (
            <Button
              component={Link}
              href={target.href}
              variant="light"
              size="compact-xs"
              rightSection={<IconArrowRight size={14} />}
              disabled={isActionDisabled}
              onClick={(event) => {
                if (isActionDisabled) event.preventDefault();
              }}
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
          {candidate.match && (
            <Group gap="xs">
              <Badge variant="outline" size="sm">
                {candidate.match.kind}
              </Badge>
              <Text c="dimmed" size="xs">
                {t("match", { confidence: t(`confidence.${candidate.match.confidence}`) })}
              </Text>
            </Group>
          )}

          {candidate.representation.signals.ambiguous && (
            <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
              {t("ambiguous")}
            </Alert>
          )}

          {health && (
            <div>
              <Text c="dimmed" size="xs" mb={4}>
                {t("health.title")}
              </Text>
              <Group gap={4}>
                {health.layers.map((layer) => (
                  <Badge key={layer.layer} color={healthStatusColor(layer.status)} variant="dot" size="sm">
                    {t(`health.layer.${layer.layer}`)}: {t(`health.status.${layer.status}`)}
                  </Badge>
                ))}
              </Group>
            </div>
          )}

          {actionNeedsUrl && (
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <Select
                label={t("url.label")}
                description={
                  selectedCandidate ? t(`reason.${selectedCandidate.reason}`) : t("reason.manualHostRequired")
                }
                value={selectedCandidateId}
                data={candidate.urlCandidates.map((item) => ({
                  value: item.id,
                  label: item.url || t("url.manual"),
                }))}
                onChange={(value) => {
                  setSelectedCandidateId(value);
                  setUrl(candidate.urlCandidates.find(({ id }) => id === value)?.url ?? "");
                }}
              />
              <TextInput
                label={t("url.inputLabel")}
                aria-label={t("url.inputLabel")}
                value={url}
                placeholder="https://service.example.com"
                error={isInvalidUrl ? t("url.invalid") : undefined}
                onChange={(event) => setUrl(event.currentTarget.value)}
              />
            </SimpleGrid>
          )}
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
};

const getCandidateTarget = (candidate: ReconciliationCandidate, url: string) => {
  if (candidate.representation.signals.ambiguous) {
    if (candidate.nextAction === "reviewIntegration" && candidate.match) {
      const params = new URLSearchParams({ search: getIntegrationName(candidate.match.kind) });
      return { kind: "reviewIntegration" as const, href: `/manage/integrations?${params.toString()}` };
    }
    return { kind: "viewRepresentation" as const, href: "/manage/apps" };
  }
  if (candidate.state === "newRecognized" && candidate.match) {
    const params = new URLSearchParams({ kind: candidate.match.kind, name: candidate.container.name });
    if (url) params.set("url", url);
    return { kind: "setupIntegration" as const, href: `/manage/integrations/new?${params.toString()}` };
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

const healthStatusColor = (status: ServiceHealth["layers"][number]["status"]) => {
  if (["available", "configured", "linked"].includes(status)) return "green";
  if (["missing", "changed", "unused"].includes(status)) return "yellow";
  return "gray";
};
