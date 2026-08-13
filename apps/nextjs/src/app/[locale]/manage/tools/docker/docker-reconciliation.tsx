"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Group,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { IconAlertTriangle, IconArrowRight, IconEyeOff, IconPlugConnected, IconRefresh } from "@tabler/icons-react";

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
  const reconciliation = clientApi.docker.reconcileServices.useQuery();
  const health = clientApi.docker.getServiceHealth.useQuery();
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
  const attentionCount = health.data
    ? health.data.services.filter(
        ({ key, status }) =>
          ["newRecognized", "newApp", "moved"].includes(status) && !dismissedCandidateKeys.includes(key),
      ).length
    : 0;
  const isRefreshing = refreshInventory.isPending || reconciliation.isFetching || health.isFetching;

  return (
    <Card withBorder>
      <Stack>
        <Group justify="space-between" align="start">
          <div>
            <Group gap="xs">
              <IconPlugConnected size={20} />
              <Text fw={600}>{t("title")}</Text>
            </Group>
            <Text c="dimmed" size="sm">
              {t("description")}
            </Text>
          </div>
          {health.data && <Badge variant="light">{t("attention", { count: String(attentionCount) })}</Badge>}
        </Group>

        <Group justify="space-between">
          <SegmentedControl
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
              <Button variant="subtle" size="xs" onClick={() => setDismissedCandidateKeys([])}>
                {t("action.restoreDismissed", { count: String(dismissedCandidateKeys.length) })}
              </Button>
            )}
            <Button
              variant="light"
              size="xs"
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
          <SimpleGrid cols={{ base: 1, lg: 2 }}>
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
          </SimpleGrid>
        )}
      </Stack>
    </Card>
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
    <Card withBorder padding="md">
      <Stack gap="sm">
        <Group justify="space-between" align="start" wrap="nowrap">
          <Group wrap="nowrap">
            <Avatar src={candidate.container.iconUrl} radius="sm">
              {candidate.container.name.at(0)?.toUpperCase()}
            </Avatar>
            <div>
              <Text fw={600} lineClamp={1}>
                {candidate.container.name}
              </Text>
              <Text c="dimmed" size="xs">
                {candidate.endpointName}
              </Text>
            </div>
          </Group>
          <Badge color={stateColor(candidate.state)} variant="light">
            {t(`state.${candidate.state}`)}
          </Badge>
        </Group>

        {candidate.match && (
          <Group gap="xs">
            <Badge variant="outline">{candidate.match.kind}</Badge>
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

        <Select
          label={t("url.label")}
          description={selectedCandidate ? t(`reason.${selectedCandidate.reason}`) : t("reason.manualHostRequired")}
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

        <Group justify="space-between">
          <Button variant="subtle" color="gray" leftSection={<IconEyeOff size={16} />} onClick={onDismiss}>
            {t("action.dismiss")}
          </Button>
          {target.kind === "createApp" ? (
            <Button
              variant="light"
              rightSection={<IconArrowRight size={16} />}
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
              rightSection={<IconArrowRight size={16} />}
              disabled={isActionDisabled}
              onClick={(event) => {
                if (isActionDisabled) event.preventDefault();
              }}
            >
              {t(`action.${target.kind}`)}
            </Button>
          )}
        </Group>
      </Stack>
    </Card>
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
