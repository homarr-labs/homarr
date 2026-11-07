"use client";

import { Box, rem, Tooltip, UnstyledButton } from "@mantine/core";
import { IconCheck, IconMinus, IconPlayerPlayFilled, IconPlayerStopFilled, IconX } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type { ContainerState } from "@homarr/docker";
import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import classes from "../app.module.css";
import { PingDot } from "../ping/ping-dot";
import type { LinkedDockerContainer } from "./container-option";

const activeStates: ContainerState[] = ["running", "restarting", "paused"];

const useToggleAction = (action: "start" | "stop", name: string) => {
  const t = useI18n();
  const utils = clientApi.useUtils();
  const notifyFailure = (message: string) =>
    showErrorNotification({ title: t(`widget.app.docker.notification.${action}Failed`, { name }), message });

  return clientApi.docker[`${action}All`].useMutation({
    async onSettled() {
      await utils.docker.getContainers.invalidate();
    },
    onSuccess([result]) {
      if (result && !result.success) notifyFailure(result.error);
    },
    onError(error) {
      notifyFailure(error.message);
    },
  });
};

interface DockerContainerToggleProps {
  container: LinkedDockerContainer;
  showStatus: boolean;
  isEditMode: boolean;
}

export const DockerContainerToggle = ({ container: linked, showStatus, isEditMode }: DockerContainerToggleProps) => {
  const t = useI18n();
  const { data, error } = clientApi.docker.getContainers.useQuery({ endpointIds: [linked.endpointId] });
  const start = useToggleAction("start", linked.name);
  const stop = useToggleAction("stop", linked.name);

  const container = data?.containers.find(
    ({ endpointId, name }) => endpointId === linked.endpointId && name === linked.name,
  );
  if (error || !container) {
    let tooltip = `${t("common.action.loading")}…`;
    if (error) tooltip = t("widget.app.option.dockerContainer.unavailable");
    else if (data) tooltip = t("widget.app.docker.notFound");
    if (!showStatus) return null;
    return <PingDot icon={IconMinus} color="gray" tooltip={tooltip} />;
  }

  const canControl =
    data?.endpoints.find(({ id }) => id === linked.endpointId)?.capabilities.includes("lifecycle") ?? false;
  const isActive = activeStates.includes(container.state);
  const isPending = start.isPending || stop.isPending;
  const isEnabled = canControl && !isEditMode && !isPending;
  const stateLabel = t(`docker.field.state.option.${container.state}`);
  const actionLabel = t(`widget.app.docker.action.${isActive ? "stop" : "start"}`, { name: container.name });
  const Icon = isActive ? IconPlayerStopFilled : IconPlayerPlayFilled;
  const isRunning = container.state === "running";

  return (
    <>
      {showStatus && (
        <PingDot
          icon={isRunning ? IconCheck : IconX}
          color={isRunning ? "green" : "red"}
          tooltip={`${linked.name}: ${stateLabel}`}
        />
      )}
      <Box className={classes.containerControls} pos="absolute" bottom={3} right={showStatus ? 20 : 4} display="flex">
        <Tooltip label={isEnabled ? `${stateLabel} · ${actionLabel}` : `${container.name}: ${stateLabel}`}>
          <UnstyledButton
            className={classes.containerToggle}
            display="flex"
            p={6}
            opacity={isPending ? 0.5 : 1}
            aria-label={actionLabel}
            data-disabled={!isEnabled || undefined}
            aria-disabled={!isEnabled}
            onClick={() => {
              if (!isEnabled) return;
              (isActive ? stop : start).mutate({ targets: [{ endpointId: container.endpointId, id: container.id }] });
            }}
          >
            <Icon style={{ width: rem(12), height: rem(12) }} />
          </UnstyledButton>
        </Tooltip>
      </Box>
    </>
  );
};
