"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, rem, Tooltip, UnstyledButton } from "@mantine/core";
import { IconPlayerPlayFilled, IconPlayerStopFilled } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type { ContainerState } from "@homarr/docker";
import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import classes from "../app.module.css";
import type { LinkedDockerContainer } from "./container-option";

const activeStates: ContainerState[] = ["running", "restarting", "paused"];

// An app usually needs a while after its container starts before it answers, so the ping is repeated until it does.
const pingRetryInterval = 3_000;
const pingRetryLimit = 90_000;

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

const useAppStartWait = (appId: string | null, onAnswered: () => void) => {
  const [until, setUntil] = useState<number | null>(null);
  const { data, dataUpdatedAt } = clientApi.widget.app.ping.useQuery(
    { id: appId ?? "" },
    { enabled: appId !== null, refetchOnMount: false, refetchInterval: until ? pingRetryInterval : false },
  );

  useEffect(() => {
    if (!until || !data) return;
    const isUp = !("error" in data) && data.statusCode < 500;
    if (!isUp && Date.now() < until) return;
    setUntil(null);
    onAnswered();
  }, [until, data, dataUpdatedAt, onAnswered]);

  return () => {
    if (appId === null) onAnswered();
    else setUntil(Date.now() + pingRetryLimit);
  };
};

export type ContainerSwitch = "start" | "stop";

interface DockerContainerToggleProps {
  container: LinkedDockerContainer;
  pingAppId: string | null;
  isEditMode: boolean;
  onSwitchChange: (action: ContainerSwitch | null) => void;
}

export const DockerContainerToggle = ({
  container: linked,
  pingAppId,
  isEditMode,
  onSwitchChange,
}: DockerContainerToggleProps) => {
  const t = useI18n();
  const utils = clientApi.useUtils();
  const { data } = clientApi.docker.getContainers.useQuery({ endpointIds: [linked.endpointId] });
  const start = useToggleAction("start", linked.name);
  const stop = useToggleAction("stop", linked.name);
  const endSwitch = useCallback(() => onSwitchChange(null), [onSwitchChange]);
  const awaitAppStart = useAppStartWait(pingAppId, endSwitch);

  const container = data?.containers.find(
    ({ endpointId, name }) => endpointId === linked.endpointId && name === linked.name,
  );
  if (!container) return null;

  const canControl =
    data?.endpoints.find(({ id }) => id === linked.endpointId)?.capabilities.includes("lifecycle") ?? false;
  const isActive = activeStates.includes(container.state);
  const isPending = start.isPending || stop.isPending;
  const isEnabled = canControl && !isEditMode && !isPending;
  const stateLabel = t(`docker.field.state.option.${container.state}`);
  const actionLabel = t(`widget.app.docker.action.${isActive ? "stop" : "start"}`, { name: container.name });
  const Icon = isActive ? IconPlayerStopFilled : IconPlayerPlayFilled;

  return (
    // Sits left of the ping dot, or in its place when pinging is off.
    <Box pos="absolute" bottom={3} right={pingAppId ? 20 : 4} display="flex">
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
            onSwitchChange(isActive ? "stop" : "start");
            (isActive ? stop : start).mutate(
              { targets: [{ endpointId: container.endpointId, id: container.id }] },
              {
                onSuccess([result]) {
                  if (!result?.success) return endSwitch();
                  if (!isActive) return awaitAppStart();
                  // A stopped container cannot answer, so the ping would only run into its timeout.
                  if (pingAppId !== null) {
                    utils.widget.app.ping.setData(
                      { id: pingAppId },
                      (previous) => previous && { url: previous.url, error: t("widget.app.docker.stopped") },
                    );
                  }
                  endSwitch();
                },
                onError: endSwitch,
              },
            );
          }}
        >
          <Icon style={{ width: rem(12), height: rem(12) }} />
        </UnstyledButton>
      </Tooltip>
    </Box>
  );
};
