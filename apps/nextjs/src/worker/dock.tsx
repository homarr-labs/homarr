"use client";

import { useState } from "react";
import { Alert, Menu, Text, Tooltip } from "@mantine/core";
import { IconCheck, IconPlugConnected, IconSettings } from "@tabler/icons-react";

import { HeaderButton } from "~/components/layout/header/button";

import { useWorkerConnections, useWorkerWorkspace } from "./context";
import { errorMessage } from "./platform";

/** Compact header access; worker management itself lives on its management page. */
export function WorkerDock() {
  const { pool, manageWorkers } = useWorkerWorkspace();
  const snapshot = useWorkerConnections();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = snapshot.workers.find(({ worker }) => worker.workerId === snapshot.primaryWorkerId);
  async function select(workerId: string) {
    if (workerId === snapshot.primaryWorkerId) return;
    setBusy(true);
    setError("");
    try {
      const candidate = snapshot.workers.find(({ worker }) => worker.workerId === workerId);
      if (!candidate?.connected) await pool.restore(workerId);
      pool.setPrimary(workerId);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  let label = "Your Homarr workers";
  if (active) label = `Your Homarr workers · ${active.worker.name}`;
  return (
    <Menu position="bottom-end" withinPortal width={260}>
      <Menu.Target>
        <Tooltip label={label}>
          <HeaderButton aria-label={label} loading={busy}>
            <IconPlugConnected size={20} stroke={1.5} />
          </HeaderButton>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Board worker</Menu.Label>
        {snapshot.workers.map(({ worker, connected }) => {
          let selection;
          if (worker.workerId === snapshot.primaryWorkerId) selection = <IconCheck size={16} />;
          return (
            <Menu.Item
              key={worker.workerId}
              disabled={busy}
              rightSection={selection}
              onClick={() => void select(worker.workerId)}
            >
              <Text size="sm" truncate>
                {worker.name}
              </Text>
              {!connected && (
                <Text size="xs" c="dimmed">
                  Offline · reconnect to open
                </Text>
              )}
            </Menu.Item>
          );
        })}
        <Menu.Divider />
        <Menu.Item leftSection={<IconSettings size={16} />} onClick={manageWorkers}>
          Your Homarr workers
        </Menu.Item>
        {error && (
          <Alert color="red" role="alert" m="xs">
            {error}
          </Alert>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
