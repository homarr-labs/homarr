import { useEffect, useRef, useState } from "react";
import {
  Accordion,
  ActionIcon,
  Alert,
  Autocomplete,
  Avatar,
  Badge,
  Button,
  Collapse,
  Group,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconEyeOff } from "@tabler/icons-react";

import type { UrlTemplateMode } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/standalone/client";

import { normalizeServiceUrl } from "../../../../../packages/onboarding/src/discovery-selection";
import {
  dismissDockerReconciliationCandidate,
  filterDockerReconciliationInbox,
  getTemplateUrl,
} from "../../../../nextjs/src/app/[locale]/manage/tools/docker/docker-reconciliation-inbox";
import type { DockerReconciliationInboxFilter } from "../../../../nextjs/src/app/[locale]/manage/tools/docker/docker-reconciliation-inbox";
import type { DockerFeatureBinding } from "./binding";
import type { DockerCandidate, DockerServiceHealth } from "./client";
import { DockerLoadError, DockerLoading } from "./feedback";
import { useDockerHealth, useDockerReconciliation } from "./queries";

export function DockerReconciliationPanel({ binding }: { binding: DockerFeatureBinding }) {
  const t = useI18n();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<DockerReconciliationInboxFilter>("attention");
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [origin, setOrigin] = useState(binding.defaultServerOrigin);
  const [mode, setMode] = useState<UrlTemplateMode>(binding.defaultUrlMode);
  const reconciliation = useDockerReconciliation(binding, true);
  const health = useDockerHealth(binding, open);
  if (reconciliation.isError)
    return <DockerLoadError error={reconciliation.error} retry={() => void reconciliation.refetch()} />;
  if (!reconciliation.data) return <DockerLoading />;
  const candidates = filterDockerReconciliationInbox(reconciliation.data.candidates, filter, dismissed);
  const attentionCount = filterDockerReconciliationInbox(reconciliation.data.candidates, "attention", dismissed).length;
  const unavailable = reconciliation.data.endpoints.filter(({ status }) => status === "unavailable");
  return (
    <Paper withBorder p="sm">
      <Stack gap="sm">
        <Group justify="space-between">
          <Group>
            <Text fw={600}>{t("docker.reconciliation.title")}</Text>
            <Badge variant="light">{t("docker.reconciliation.suggestions", { count: String(attentionCount) })}</Badge>
          </Group>
          <Button variant="subtle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            {open ? t("common.action.hide") : t("docker.reconciliation.action.review")}
          </Button>
        </Group>
        <Collapse expanded={open} transitionDuration={0}>
          <Stack gap="sm">
            <TextInput
              label={t("common.serviceUrlTemplate.serverTitle")}
              value={origin}
              onChange={(event) => setOrigin(event.currentTarget.value)}
            />
            <SegmentedControl
              value={mode}
              aria-label={t("common.serviceUrlTemplate.urlModeLabel")}
              onChange={(value) => {
                if (value === "hostPort" || value === "subdomain" || value === "path") setMode(value);
              }}
              data={[
                { value: "hostPort", label: t("common.serviceUrlTemplate.hostPort") },
                { value: "subdomain", label: t("common.serviceUrlTemplate.subdomain") },
                { value: "path", label: t("common.serviceUrlTemplate.path") },
              ]}
            />
            <Group justify="space-between">
              <SegmentedControl
                value={filter}
                onChange={(value) => {
                  if (value === "attention" || value === "represented" || value === "all") setFilter(value);
                }}
                data={[
                  { value: "attention", label: t("docker.reconciliation.filter.attention") },
                  { value: "represented", label: t("docker.reconciliation.filter.represented") },
                  { value: "all", label: t("docker.reconciliation.filter.all") },
                ]}
              />
              {dismissed.length > 0 && (
                <Button variant="subtle" onClick={() => setDismissed([])}>
                  {t("docker.reconciliation.action.restoreDismissed", { count: String(dismissed.length) })}
                </Button>
              )}
            </Group>
            {unavailable.length > 0 && (
              <Alert color="yellow">
                {t("docker.reconciliation.endpointUnavailable", {
                  names: unavailable.map(({ name }) => name).join(", "),
                })}
              </Alert>
            )}
            {health.isPending && <DockerLoading />}
            {health.isError && <DockerLoadError error={health.error} retry={() => void health.refetch()} />}
            {health.data && (
              <Text size="sm">
                Configuration health does not establish authentication, API request or widget query health. Not-observed
                layers remain unverified.
              </Text>
            )}
            {candidates.length === 0 ? (
              <Text size="sm">
                {t(
                  reconciliation.data.candidates.length === 0
                    ? "docker.reconciliation.empty"
                    : "docker.reconciliation.emptyFilter",
                )}
              </Text>
            ) : (
              <Accordion multiple variant="separated" radius="sm" transitionDuration={0}>
                {candidates.map((candidate) => (
                  <DockerReconciliationCandidate
                    key={candidate.candidateKey}
                    binding={binding}
                    candidate={candidate}
                    health={health.data?.services.find(({ key }) => key === candidate.candidateKey)}
                    origin={origin}
                    mode={mode}
                    onDismiss={() =>
                      setDismissed((current) => dismissDockerReconciliationCandidate(current, candidate.candidateKey))
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
}

function getCandidateAction(candidate: DockerCandidate) {
  if (candidate.representation.signals.ambiguous) {
    return candidate.nextAction === "reviewIntegration" && candidate.match ? "reviewIntegration" : "viewRepresentation";
  }
  if (candidate.state === "newRecognized" && candidate.match) return "setupIntegration";
  if (candidate.state === "newApp") return "createApp";
  if (candidate.representation.integration)
    return candidate.state === "moved" ? "reviewIntegration" : "viewRepresentation";
  if (candidate.representation.app) return "viewRepresentation";
  return "createApp";
}

function DockerReconciliationCandidate({
  binding,
  candidate,
  health,
  origin,
  mode,
  onDismiss,
}: {
  binding: DockerFeatureBinding;
  candidate: DockerCandidate;
  health: DockerServiceHealth | undefined;
  origin: string;
  mode: UrlTemplateMode;
  onDismiss: () => void;
}) {
  const t = useI18n();
  const template = getTemplateUrl(candidate, origin, mode);
  const suggestions = Array.from(new Set([template, ...candidate.urlCandidates.map(({ url }) => url)].filter(Boolean)));
  const initialUrl = suggestions[0] ?? "";
  const [url, setUrl] = useState(initialUrl);
  const edited = useRef(false);
  useEffect(() => {
    if (!edited.current) setUrl(initialUrl);
  }, [initialUrl]);
  const action = getCandidateAction(candidate);
  const navigation = binding.navigation;
  const available = action === "createApp" ? Boolean(navigation.addApps) : Boolean(navigation[action]);
  const needsUrl = action === "createApp" || action === "setupIntegration";
  const normalizedUrl = normalizeServiceUrl(url);
  const invoke = () => {
    if (!available || (needsUrl && (binding.readOnly || !normalizedUrl))) return;
    if (action === "createApp") navigation.addApps?.([candidate.container], [normalizedUrl]);
    else if (action === "setupIntegration") navigation.setupIntegration?.(candidate, normalizedUrl ?? url);
    else if (action === "reviewIntegration") navigation.reviewIntegration?.(candidate);
    else navigation.viewRepresentation?.(candidate);
  };
  const color =
    candidate.state === "linked" || candidate.state === "represented"
      ? "green"
      : candidate.state === "moved"
        ? "yellow"
        : "blue";
  return (
    <Accordion.Item value={candidate.candidateKey}>
      <Group wrap="nowrap" gap={4} pr="sm">
        <Accordion.Control
          style={{ flex: 1 }}
          icon={
            <Avatar src={candidate.container.iconUrl} size="sm" radius="sm">
              {candidate.container.name.at(0)?.toUpperCase()}
            </Avatar>
          }
        >
          <Group gap="xs">
            <Text fw={600} size="sm">
              {candidate.container.name}
            </Text>
            <Badge color={color} variant="light">
              {t(`docker.reconciliation.state.${candidate.state}`)}
            </Badge>
          </Group>
          <Text size="xs">{candidate.endpointName}</Text>
        </Accordion.Control>
        <Tooltip label={t("docker.reconciliation.action.dismiss")}>
          <ActionIcon
            aria-label={t("docker.reconciliation.action.dismiss")}
            variant="subtle"
            color="gray"
            onClick={onDismiss}
          >
            <IconEyeOff size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <Accordion.Panel>
        <Stack gap="sm">
          {candidate.representation.signals.ambiguous && (
            <Alert color="yellow">{t("docker.reconciliation.ambiguous")}</Alert>
          )}
          {health && (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
              {health.layers.map((layer) => (
                <Group key={layer.layer} gap="xs">
                  <Text size="xs">{t(`docker.reconciliation.health.layer.${layer.layer}`)}</Text>
                  <Badge
                    color={
                      ["available", "configured", "linked"].includes(layer.status)
                        ? "green"
                        : ["missing", "changed", "unused"].includes(layer.status)
                          ? "yellow"
                          : "gray"
                    }
                    variant="light"
                  >
                    {t(`docker.reconciliation.health.status.${layer.status}`)}
                  </Badge>
                </Group>
              ))}
            </SimpleGrid>
          )}
          {needsUrl && (
            <Autocomplete
              label="URL"
              value={url}
              data={suggestions}
              placeholder={t("docker.reconciliation.url.manual")}
              onChange={(value) => {
                edited.current = true;
                setUrl(value);
              }}
            />
          )}
          <Button
            w="fit-content"
            variant="light"
            disabled={!available || (needsUrl && (binding.readOnly || !normalizedUrl))}
            onClick={invoke}
          >
            {action === "createApp"
              ? t("integration.field.createApp.label")
              : t(`docker.reconciliation.action.${action}`)}
          </Button>
          {!available && (
            <Text size="sm">The source setup action requires a private app/integration navigation binding.</Text>
          )}
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
