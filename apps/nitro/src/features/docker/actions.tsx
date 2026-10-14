import { Badge, Group, Stack, Text } from "@mantine/core";

import { useI18n } from "@homarr/translation/standalone/client";
import type { TranslationFunction } from "@homarr/translation/standalone";

import { DockerActionBarView, DockerContainerMenuView, DockerRemovalConfirmationView } from "../../source-ui/docker";
import type { DockerFeatureBinding } from "./binding";
import type { DockerAction, DockerActionResults, DockerContainer, DockerEndpoint } from "./client";
import { endpointHasCapability } from "./client";

function getActionLabels(t: TranslationFunction) {
  return {
    start: t("docker.action.start.label"),
    stop: t("docker.action.stop.label"),
    restart: t("docker.action.restart.label"),
    remove: t("common.action.remove"),
    addApps: t("docker.action.addToHomarr.label"),
    logs: t("docker.action.logs.label"),
    title: t("docker.action.title"),
  };
}

export function canRunDockerAction(containers: DockerContainer[], endpoints: DockerEndpoint[], action: DockerAction) {
  return (
    containers.length > 0 &&
    containers.length <= 100 &&
    containers.every((container) =>
      endpointHasCapability(
        endpoints.find(({ id }) => id === container.endpointId),
        action === "remove" ? "remove" : "lifecycle",
      ),
    )
  );
}

interface DockerActionGroupProps {
  binding: DockerFeatureBinding;
  containers: DockerContainer[];
  endpoints: DockerEndpoint[];
  pending: boolean;
  onAction: (action: DockerAction, containers: DockerContainer[]) => void;
}

export function DockerActionGroup(props: DockerActionGroupProps) {
  const t = useI18n();
  return (
    <DockerActionBarView
      containers={props.containers}
      pending={props.pending}
      labels={getActionLabels(t)}
      canRun={(action, containers) =>
        !props.binding.readOnly && canRunDockerAction(containers, props.endpoints, action)
      }
      onAction={props.onAction}
      onAddApps={props.binding.readOnly ? undefined : props.binding.navigation.addApps}
    />
  );
}

export function DockerContainerMenu(
  props: DockerActionGroupProps & { container: DockerContainer; onLogs: (container: DockerContainer) => void },
) {
  const t = useI18n();
  const endpoint = props.endpoints.find(({ id }) => id === props.container.endpointId);
  return (
    <DockerContainerMenuView
      containers={props.containers}
      container={props.container}
      pending={props.pending}
      labels={getActionLabels(t)}
      canRun={(action, containers) =>
        !props.binding.readOnly && canRunDockerAction(containers, props.endpoints, action)
      }
      onAction={props.onAction}
      onAddApps={props.binding.readOnly ? undefined : props.binding.navigation.addApps}
      onLogs={endpointHasCapability(endpoint, "logs") ? props.onLogs : undefined}
    />
  );
}

export function DockerRemovalConfirmation({
  containers,
  pending,
  allowed,
  onClose,
  onConfirm,
}: {
  containers: DockerContainer[] | null;
  pending: boolean;
  allowed: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useI18n();
  const selected = containers ?? [];
  return (
    <DockerRemovalConfirmationView
      opened={containers !== null}
      onClose={onClose}
      title={t("docker.action.remove.confirmation.title", { count: String(selected.length) })}
      message={t("docker.action.remove.confirmation.message", {
        count: String(selected.length),
        names: selected.map(({ name }) => name).join(", "),
      })}
      pending={pending}
      allowed={allowed}
      cancelLabel={t("common.action.cancel")}
      removeLabel={t("common.action.remove")}
      onConfirm={onConfirm}
    />
  );
}

export function DockerActionResult({
  action,
  containers,
  results,
}: {
  action: DockerAction;
  containers: DockerContainer[];
  results: DockerActionResults;
}) {
  const t = useI18n();
  const failures = results.filter(({ success }) => !success);
  const missing = containers.filter(
    (container) =>
      !results.some(({ target }) => target.endpointId === container.endpointId && target.id === container.id),
  );
  const hasFailure = failures.length > 0 || missing.length > 0;
  let message: string | undefined;
  if (!hasFailure) message = t(`docker.action.${action}.notification.success.message`);
  if (failures.length > 0) {
    message = t("docker.action.result.failure.message", {
      failed: String(failures.length),
      total: String(results.length),
      names: failures
        .map(
          ({ target }) =>
            containers.find(({ endpointId, id }) => endpointId === target.endpointId && id === target.id)?.name ??
            target.id,
        )
        .join(", "),
    });
  }
  return (
    <Stack gap="xs" aria-live="polite">
      <Text fw={600}>
        {hasFailure ? t("docker.action.result.failure.title") : t(`docker.action.${action}.notification.success.title`)}
      </Text>
      {message && <Text size="sm">{message}</Text>}
      {results.map((result, index) => {
        const container = containers.find(
          ({ endpointId, id }) => endpointId === result.target.endpointId && id === result.target.id,
        );
        return (
          <Group key={`${result.target.endpointId}:${result.target.id}:${index}`} gap="xs">
            <Badge color={result.success ? "green" : "red"}>{result.success ? "Succeeded" : "Failed"}</Badge>
            <Text size="sm">
              {container?.endpointName ?? result.target.endpointId}: {container?.name ?? result.target.id}
              {!result.success && `: ${result.error}`}
            </Text>
          </Group>
        );
      })}
      {missing.map((container) => (
        <Text key={container.resourceId} c="orange" size="sm">
          {container.endpointName}: {container.name}: no action result returned
        </Text>
      ))}
    </Stack>
  );
}
