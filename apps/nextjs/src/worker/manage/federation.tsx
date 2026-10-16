"use client";

import { useState } from "react";
import { Alert, Badge, Button, Group, MultiSelect, NativeSelect, Paper, Stack, Text, Title } from "@mantine/core";
import { IconAffiliate, IconPlugConnected } from "@tabler/icons-react";
import { createTRPCClient } from "@trpc/client";

import type { RouterOutputs } from "@homarr/api";
import { clientApi, useScopedFetchApi } from "@homarr/api/client";
import type { AppRouter } from "@homarr/api/legacy";
import { createWorkerLink } from "@homarr/api/worker-link";
import { getIntegrationName } from "@homarr/definitions";
import { workerRequest } from "@homarr/worker-client";

import { useWorkerConnections, useWorkerWorkspace } from "~/worker/context";

type SourceIntegration = RouterOutputs["integration"]["all"][number];
type SourceAccess = "query" | "interact" | "full";

/** Selected source services become ordinary integration references on this worker. */
export function WorkerFederationPanel() {
  const { pool, manageWorkers } = useWorkerWorkspace();
  const snapshot = useWorkerConnections();
  const primaryApi = useScopedFetchApi();
  const utils = clientApi.useUtils();
  const connectionsQuery = clientApi.federation.connections.useQuery();
  const [sourceWorkerId, setSourceWorkerId] = useState("");
  const [sourceIntegrations, setSourceIntegrations] = useState<SourceIntegration[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sourceAccess, setSourceAccess] = useState<SourceAccess>("query");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const sourceWorkers = snapshot.workers.filter(
    ({ worker }) => worker.workerId !== snapshot.primaryWorkerId && worker.grant.role === "owner",
  );
  const primary = snapshot.workers.find(({ worker }) => worker.workerId === snapshot.primaryWorkerId)?.worker;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to connect these workers.");
    } finally {
      setBusy(false);
    }
  }

  async function loadSource() {
    await run(async () => {
      if (!sourceWorkerId) throw new Error("Select a source worker first.");
      await pool.restore(sourceWorkerId);
      const connection = pool.getConnection(sourceWorkerId);
      const source = createTRPCClient<AppRouter>({ links: [createWorkerLink(connection)] });
      const integrations = await source.integration.all.query();
      const available = integrations.filter(
        (integration) => integration.permissions.hasFullAccess && !integration.origin,
      );
      setSourceIntegrations(available);
      setSelectedIds([]);
      if (available.length === 0)
        setNotice("This worker has no integrations you can share. Add an integration there first.");
    });
  }

  async function connectSource() {
    await run(async () => {
      const worker = pool.getWorker(sourceWorkerId);
      if (!worker || !primary || worker.workerId === primary.workerId)
        throw new Error("Select another worker as the source.");
      if (selectedIds.length === 0) throw new Error("Select at least one integration.");
      await pool.restore(worker.workerId);
      const sourceConnection = pool.getConnection(worker.workerId);
      let address = worker.directUrl;
      if (worker.mode === "relay") address = worker.relayUrl;
      const prepared = await primaryApi.federation.prepareConnection.mutate({
        workerId: worker.workerId,
        publicKey: {
          kty: worker.pinnedIdentity.kty,
          crv: worker.pinnedIdentity.crv,
          x: worker.pinnedIdentity.x,
          y: worker.pinnedIdentity.y,
        },
        name: worker.name,
        mode: worker.mode,
        address,
        capability: worker.relayCapability,
      });
      let sourceGrantId: string | undefined;
      try {
        const procedurePaths = await primaryApi.federation.procedurePaths.query({ access: sourceAccess });
        const { grant } = await workerRequest<{ grant: { id: string; token: string } }>(
          sourceConnection,
          "/remote/access/services",
          {
            method: "POST",
            body: JSON.stringify({
              devicePublicJwk: prepared.devicePublicJwk,
              service: {
                purpose: "federation",
                integrationIds: selectedIds,
                access: sourceAccess,
                procedurePaths,
                audience: prepared.audience,
                principalId: prepared.principalId,
              },
              expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
            }),
          },
        );
        sourceGrantId = grant.id;
        await primaryApi.federation.authorizeConnection.mutate({
          connectionId: prepared.connectionId,
          grantToken: grant.token,
        });
        await primaryApi.federation.importIntegrations.mutate({
          connectionId: prepared.connectionId,
          integrationIds: selectedIds,
        });
      } catch (cause) {
        await primaryApi.federation.disable.mutate({ connectionId: prepared.connectionId }).catch(() => {});
        if (sourceGrantId)
          await workerRequest(sourceConnection, `/remote/access/grants/${encodeURIComponent(sourceGrantId)}`, {
            method: "DELETE",
          }).catch(() => {});
        throw cause;
      }
      await Promise.all([utils.federation.connections.invalidate(), utils.integration.all.invalidate()]);
      setSelectedIds([]);
      setNotice(
        `Selected services from ${worker.name} are now available to ${primary.name}. The source approval lasts up to 30 days.`,
      );
    });
  }

  async function disconnect(connectionId: string) {
    await run(async () => {
      await primaryApi.federation.disable.mutate({ connectionId });
      await utils.federation.connections.invalidate();
      setNotice(
        "Source disconnected. Existing widgets retain their integration references and report the unavailable source.",
      );
    });
  }

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Group gap="xs">
          <IconAffiliate size={20} />
          <Title order={3}>Services from your other workers</Title>
        </Group>
        <Text size="sm" c="dimmed">
          Keep this worker as the owner of your boards. Connect services from another worker so the normal widget
          selectors can use them. Credentials stay on the source worker.
        </Text>
        <Text size="xs" c="dimmed">
          The primary worker uses the source's selected direct or relay connection. A direct address must be reachable
          from both your browser and the primary worker.
        </Text>
        {error && (
          <Alert color="red" role="alert">
            {error}
          </Alert>
        )}
        {connectionsQuery.error && (
          <Alert color="red" role="alert">
            {connectionsQuery.error.message}
          </Alert>
        )}
        {notice && <Alert color="green">{notice}</Alert>}
        {connectionsQuery.data?.map((connection) => (
          <Group key={connection.id} justify="space-between">
            <Group gap="xs">
              <Text size="sm">{connection.name}</Text>
              <Badge color={connection.enabled && connection.ready ? "green" : "gray"}>
                {connection.enabled && connection.ready ? "Approved" : "Disconnected"}
              </Badge>
            </Group>
            {connection.enabled && (
              <Button
                size="xs"
                variant="subtle"
                color="red"
                loading={busy}
                onClick={() => void disconnect(connection.id)}
              >
                Disconnect
              </Button>
            )}
          </Group>
        ))}
        {sourceWorkers.length === 0 && (
          <Button variant="light" leftSection={<IconPlugConnected size={16} />} onClick={manageWorkers}>
            Connect another worker
          </Button>
        )}
        {sourceWorkers.length > 0 && (
          <>
            <Group align="end">
              <NativeSelect
                label="Source worker"
                value={sourceWorkerId}
                onChange={(event) => {
                  setSourceWorkerId(event.currentTarget.value);
                  setSourceIntegrations([]);
                  setSelectedIds([]);
                }}
                disabled={busy}
                data={[
                  { value: "", label: "Select a worker" },
                  ...sourceWorkers.map(({ worker }) => ({ value: worker.workerId, label: worker.name })),
                ]}
                style={{ flex: 1 }}
              />
              <Button variant="default" disabled={!sourceWorkerId} loading={busy} onClick={() => void loadSource()}>
                Load integrations
              </Button>
            </Group>
            {sourceIntegrations.length > 0 && (
              <>
                <MultiSelect
                  label="Integrations to make available here"
                  data={sourceIntegrations.map((integration) => ({
                    value: integration.id,
                    label: `${integration.name} · ${getIntegrationName(integration.kind)}`,
                  }))}
                  value={selectedIds}
                  onChange={setSelectedIds}
                  searchable
                  disabled={busy}
                />
                <NativeSelect
                  label="What this worker may do"
                  value={sourceAccess}
                  onChange={(event) => setSourceAccess(event.currentTarget.value as SourceAccess)}
                  disabled={busy}
                  data={[
                    { value: "query", label: "Read widget data" },
                    { value: "interact", label: "Read data and run native actions" },
                    { value: "full", label: "Full integration access, including Custom Widget requests" },
                  ]}
                />
                <Button disabled={selectedIds.length === 0} loading={busy} onClick={() => void connectSource()}>
                  Approve and add selected integrations
                </Button>
              </>
            )}
          </>
        )}
      </Stack>
    </Paper>
  );
}
