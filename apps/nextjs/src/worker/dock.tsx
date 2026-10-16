"use client";

import { useState } from "react";
import { ActionIcon, Badge, Button, Group, NativeSelect, Paper, Text, Tooltip } from "@mantine/core";
import { IconPlugConnected, IconSettings } from "@tabler/icons-react";

import { useWorkerConnections, useWorkerWorkspace } from "./context";
import { errorMessage } from "./platform";

export function WorkerDock() {
  const { pool, manageWorkers } = useWorkerWorkspace();
  const snapshot = useWorkerConnections();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = snapshot.workers.find(({ worker }) => worker.workerId === snapshot.primaryWorkerId);
  async function select(workerId: string) {
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
  return (
    <Paper
      component="aside"
      aria-label="Homarr workers"
      withBorder
      radius="xl"
      shadow="md"
      px="sm"
      py={6}
      style={{
        position: "fixed",
        bottom: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 190,
        maxWidth: "calc(100vw - 24px)",
      }}
    >
      <Group gap="xs" wrap="nowrap">
        <Tooltip label="Workers and organizations">
          <ActionIcon variant="subtle" onClick={manageWorkers} aria-label="Manage workers">
            <IconPlugConnected size={20} />
          </ActionIcon>
        </Tooltip>
        {active ? (
          <>
            <NativeSelect
              aria-label="Dashboard worker"
              value={active.worker.workerId}
              disabled={busy}
              onChange={(event) => void select(event.currentTarget.value)}
              data={snapshot.workers.map(({ worker }) => ({ label: worker.name, value: worker.workerId }))}
              styles={{ input: { border: 0, background: "transparent", maxWidth: 220 } }}
              style={{ flex: 1, minWidth: 0, width: "clamp(100px, 40vw, 220px)" }}
            />
            <Badge size="xs" color={active.connected ? "green" : "gray"} variant="dot" visibleFrom="sm">
              {active.worker.mode}
            </Badge>
          </>
        ) : (
          <Button size="xs" variant="subtle" onClick={manageWorkers}>
            Connect your worker
          </Button>
        )}
        <Tooltip label="Worker setup">
          <ActionIcon variant="subtle" onClick={manageWorkers} aria-label="Worker setup">
            <IconSettings size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
      {error && (
        <Text size="xs" c="red" maw={400}>
          {error}
        </Text>
      )}
    </Paper>
  );
}
