"use client";

import { Tooltip } from "@mantine/core";
import { IconPlugConnected } from "@tabler/icons-react";
import { HeaderButton } from "~/components/layout/header/button";
import { useWorkerConnections, useWorkerWorkspace } from "./context";

export function WorkerDock() {
  const { manageWorkers } = useWorkerWorkspace();
  const snapshot = useWorkerConnections();
  const active = snapshot.workers.find(({ worker }) => worker.workerId === snapshot.primaryWorkerId);
  if (active?.worker.grant.role === "viewer") return null;
  let label = "Worker settings";
  if (active) label = `Worker settings · ${active.worker.name}`;
  return (
    <Tooltip label={label}>
      <HeaderButton aria-label={label} onClick={manageWorkers}>
        <IconPlugConnected size={20} stroke={1.5} />
      </HeaderButton>
    </Tooltip>
  );
}
