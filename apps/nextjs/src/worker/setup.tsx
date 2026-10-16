"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Group,
  NativeSelect,
  Paper,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { IconAffiliate, IconCheck, IconKey, IconPlugConnected, IconUsers } from "@tabler/icons-react";

import type { EnrollmentChallenge } from "@homarr/remote-protocol";
import type { WorkerEnrollment } from "@homarr/remote-platform/types";
import type { ConnectionInput, SavedWorker } from "@homarr/worker-client";
import {
  browserCryptoAvailable,
  matchingSavedWorker,
  parseConnectionLink,
  validateConnectionAddress,
  workerRequest,
} from "@homarr/worker-client";

import { useWorkerConnections, useWorkerWorkspace } from "./context";
import { WorkerAccount, errorMessage, usePlatformAccount } from "./platform";
import { WorkerOrganizations } from "./organizations";
import { WorkerSharing } from "./sharing";
import { WorkerMcp } from "./mcp";
import { WorkerLocalAccounts, WorkerLocalLoginLink } from "./local-accounts";

export function WorkerSetup({
  onClose,
  initialLink,
  initialTab,
}: {
  onClose: () => void;
  initialLink: string;
  initialTab: string;
}) {
  const { pool, organizationId } = useWorkerWorkspace();
  const snapshot = useWorkerConnections();
  const { session, request } = usePlatformAccount();
  const [link, setLink] = useState("");
  const [cryptoAvailable, setCryptoAvailable] = useState(false);
  useEffect(() => setCryptoAvailable(browserCryptoAvailable()), []);
  const [tab, setTab] = useState<string | null>("workers");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [expandedWorkerId, setExpandedWorkerId] = useState<string | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  useEffect(() => {
    if (initialLink) setLink(initialLink);
  }, [initialLink]);
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);
  const selected =
    snapshot.workers.find(({ worker }) => worker.workerId === selectedWorkerId) ??
    snapshot.workers.find(({ worker }) => worker.workerId === snapshot.primaryWorkerId) ??
    snapshot.workers[0];
  const connection = useMemo(() => {
    if (!selected?.connected) return null;
    return pool.getConnection(selected.worker.workerId);
  }, [pool, selected]);
  async function action(execute: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await execute();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  async function connectInput(input: ConnectionInput) {
    const saved = matchingSavedWorker(
      snapshot.workers.map(({ worker }) => worker),
      input,
    );
    let worker: SavedWorker;
    const restoreSaved =
      input.credential.kind === "claim" || input.credential.kind === "grant" || input.credential.kind === "invite";
    if (saved && restoreSaved) worker = await pool.restore(saved.workerId);
    else worker = await pool.connectInput(input);
    // Adding a service worker keeps the board on its current primary.
    // A shared board link still opens the board it was created for.
    if (!snapshot.primaryWorkerId || input.credential.kind === "share" || worker.grant.role === "viewer") {
      pool.setPrimary(worker.workerId);
    }
    setSelectedWorkerId(worker.workerId);
    setLink("");
    onClose();
  }
  async function connect(event: React.FormEvent) {
    event.preventDefault();
    await action(() => connectInput(parseConnectionLink(link, window.location.origin)));
  }
  const localLogin = useMemo(() => {
    if (!link) return false;
    try {
      const input = parseConnectionLink(link, window.location.origin);
      return input.credential.kind === "local-register" || input.credential.kind === "local-login";
    } catch {
      return false;
    }
  }, [link]);
  async function enroll(worker: SavedWorker) {
    await action(async () => {
      const { challenge } = await request<{ challenge: EnrollmentChallenge }>("/api/workers/challenge", {
        method: "POST",
      });
      const proof = await workerRequest<
        Pick<WorkerEnrollment, "workerId" | "workerPublicKey" | "workerSigningKey" | "signature">
      >(pool.getConnection(worker.workerId), "/remote/platform-enrollment", {
        method: "POST",
        body: JSON.stringify({ challenge }),
      });
      await request("/api/workers", {
        method: "POST",
        body: JSON.stringify({
          ...proof,
          challenge,
          name: worker.name,
          mode: worker.mode,
          relayUrl: worker.relayUrl || null,
          directUrl: worker.directUrl || null,
        }),
      });
      setNotice("Worker added to your account. You can now add it to an organization.");
    });
  }
  return (
    <>
      <Stack>
        <Text c="dimmed" size="sm">
          Pick the worker that stores your boards. Keep other workers connected to use integrations from your other
          servers.
        </Text>
        {(tab === "organizations" || tab === "sharing" || tab === "mcp") && snapshot.workers.length > 1 && (
          <NativeSelect
            label="Worker"
            value={selected?.worker.workerId ?? ""}
            onChange={(event) => setSelectedWorkerId(event.currentTarget.value)}
            data={snapshot.workers.map(({ worker }) => ({ label: worker.name, value: worker.workerId }))}
          />
        )}
        <Tabs value={tab} onChange={setTab}>
          <Tabs.List style={{ flexWrap: "wrap" }}>
            <Tabs.Tab value="workers" leftSection={<IconPlugConnected size={16} />}>
              Workers
            </Tabs.Tab>
            <Tabs.Tab value="account" leftSection={<IconUsers size={16} />}>
              Account
            </Tabs.Tab>
            <Tabs.Tab value="organizations" leftSection={<IconUsers size={16} />}>
              Organizations
            </Tabs.Tab>
            <Tabs.Tab value="sharing" leftSection={<IconKey size={16} />}>
              Sharing
            </Tabs.Tab>
            <Tabs.Tab value="mcp" leftSection={<IconAffiliate size={16} />}>
              MCP
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="workers" pt="md">
            <Stack>
              {!cryptoAvailable && (
                <Alert color="yellow">Open Homarr using its HTTPS address before connecting a worker.</Alert>
              )}
              <Paper withBorder p="md" radius="md">
                <form onSubmit={(event) => void connect(event)}>
                  <Stack>
                    <Title order={4}>Connect a worker</Title>
                    <Textarea
                      label="Private connection link"
                      placeholder="Paste the complete setup or invitation link from your worker"
                      required
                      minRows={2}
                      value={link}
                      onChange={(event) => setLink(event.currentTarget.value)}
                      autoComplete="off"
                      data-private="true"
                      spellCheck={false}
                    />
                    {link && (
                      <Text size="sm" c="green">
                        <IconCheck size={14} /> Connection link ready.
                      </Text>
                    )}
                    {!localLogin && (
                      <Button type="submit" loading={busy} disabled={!cryptoAvailable}>
                        Connect worker
                      </Button>
                    )}
                  </Stack>
                </form>
                <WorkerLocalLoginLink link={link} onConnect={connectInput} />
              </Paper>
              {snapshot.workers.map((entry) => (
                <Paper key={entry.worker.workerId} withBorder p="md" radius="md">
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <div>
                        <Text fw={600} style={{ overflowWrap: "anywhere" }}>
                          {entry.worker.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {entry.worker.workerId.slice(0, 24)}…
                        </Text>
                      </div>
                      <Group gap="xs">
                        <Badge color={entry.connected ? "green" : "gray"}>
                          {entry.connected ? "Connected" : "Offline"}
                        </Badge>
                        {snapshot.primaryWorkerId === entry.worker.workerId && (
                          <Badge variant="light">Board worker</Badge>
                        )}
                      </Group>
                    </Group>
                    <Group>
                      <Button
                        size="xs"
                        loading={busy}
                        onClick={() =>
                          void action(async () => {
                            if (!entry.connected) await pool.restore(entry.worker.workerId);
                            pool.setPrimary(entry.worker.workerId);
                            setSelectedWorkerId(entry.worker.workerId);
                            onClose();
                          })
                        }
                      >
                        Open Homarr
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => {
                          setSelectedWorkerId(entry.worker.workerId);
                          setExpandedWorkerId((current) =>
                            current === entry.worker.workerId ? null : entry.worker.workerId,
                          );
                        }}
                      >
                        Connection settings
                      </Button>
                      {entry.connected && session.user && entry.worker.grant.role === "owner" && (
                        <Button size="xs" variant="default" onClick={() => void enroll(entry.worker)}>
                          Add to account
                        </Button>
                      )}
                      {entry.connected && (
                        <Button size="xs" variant="subtle" onClick={() => pool.disconnect(entry.worker.workerId)}>
                          Disconnect
                        </Button>
                      )}
                      <Button
                        size="xs"
                        variant="subtle"
                        color="red"
                        onClick={() => void action(() => pool.forget(entry.worker.workerId))}
                      >
                        Forget this browser
                      </Button>
                    </Group>
                    {expandedWorkerId === entry.worker.workerId && (
                      <ConnectionSettings
                        worker={entry.worker}
                        apply={(input) =>
                          action(async () => {
                            await pool.connectInput(input);
                            setNotice("Connection saved.");
                          })
                        }
                      />
                    )}
                    {entry.error && (
                      <Text size="sm" c="red">
                        {entry.error}
                      </Text>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Tabs.Panel>
          <Tabs.Panel value="account" pt="md">
            <Stack>
              <Text size="sm" c="dimmed">
                Your local organization and users are managed on your worker.
              </Text>
              <Group>
                <Button variant="default" onClick={() => setTab("organizations")}>
                  Manage local organization
                </Button>
              </Group>
              <Paper withBorder p="md" radius="md">
                <Stack gap="sm">
                  <Title order={4}>Homarr cloud account</Title>
                  <Text size="sm" c="dimmed">
                    Optional. Use a cloud account to organize workers across servers.
                  </Text>
                  <WorkerAccount />
                </Stack>
              </Paper>
            </Stack>
          </Tabs.Panel>
          <Tabs.Panel value="organizations" pt="md">
            <Stack>
              {connection && selected && (
                <WorkerLocalAccounts key={selected.worker.workerId} worker={selected.worker} connection={connection} />
              )}
              {!connection && (
                <Paper withBorder p="md" radius="md">
                  <Stack gap="xs">
                    <Title order={3}>Your local organization</Title>
                    <Text c="dimmed" size="sm">
                      Connect a worker to create an organization and invite users.
                    </Text>
                    <Group>
                      <Button variant="default" onClick={() => setTab("workers")}>
                        Connect a worker
                      </Button>
                    </Group>
                  </Stack>
                </Paper>
              )}
              <Accordion variant="separated">
                <Accordion.Item value="cloud-organizations">
                  <Accordion.Control>Cloud organizations · optional</Accordion.Control>
                  <Accordion.Panel>
                    <WorkerOrganizations />
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            </Stack>
          </Tabs.Panel>
          <Tabs.Panel value="sharing" pt="md">
            {connection && selected ? (
              <WorkerSharing worker={selected.worker} connection={connection} />
            ) : (
              <Text c="dimmed">Connect a worker to manage its private links.</Text>
            )}
          </Tabs.Panel>
          <Tabs.Panel value="mcp" pt="md">
            {connection && selected ? (
              <WorkerMcp
                key={`${selected.worker.workerId}:${organizationId ?? "personal"}`}
                worker={selected.worker}
                connection={connection}
              />
            ) : (
              <Text c="dimmed">Connect a worker to approve MCP access.</Text>
            )}
          </Tabs.Panel>
        </Tabs>

        {error && (
          <Alert color="red" role="alert">
            {error}
          </Alert>
        )}
        {notice && <Alert color="green">{notice}</Alert>}
      </Stack>
    </>
  );
}

function ConnectionSettings({
  worker,
  apply,
}: {
  worker: SavedWorker;
  apply: (input: ConnectionInput) => Promise<void>;
}) {
  const [mode, setMode] = useState(worker.mode);
  const [name, setName] = useState(worker.name);
  const [directUrl, setDirectUrl] = useState(worker.directUrl);
  const [relayUrl, setRelayUrl] = useState(worker.relayUrl);
  const [error, setError] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      validateConnectionAddress(mode, mode === "direct" ? directUrl : relayUrl);
      await apply({ ...worker, name, mode, directUrl, relayUrl });
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }
  return (
    <form onSubmit={(event) => void save(event)}>
      <Stack gap="sm">
        <TextInput label="Worker name" value={name} onChange={(event) => setName(event.currentTarget.value)} required />
        <NativeSelect
          label="Connection"
          value={mode}
          onChange={(event) => setMode(event.currentTarget.value as "direct" | "relay")}
          data={[
            { value: "relay", label: "Homarr relay" },
            { value: "direct", label: "Direct or Tailscale" },
          ]}
        />
        {mode === "direct" ? (
          <TextInput
            label="Worker URL"
            value={directUrl}
            onChange={(event) => setDirectUrl(event.currentTarget.value)}
            required
          />
        ) : (
          <TextInput
            label="Relay URL"
            value={relayUrl}
            onChange={(event) => setRelayUrl(event.currentTarget.value)}
            required
          />
        )}
        <Text size="xs" c="dimmed">
          This selects how your browser reaches the worker. Global MCP uses the Homarr relay.
        </Text>
        <Group>
          <Button type="submit" size="xs" variant="default">
            Save and reconnect
          </Button>
        </Group>
        {error && (
          <Text c="red" size="sm">
            {error}
          </Text>
        )}
      </Stack>
    </form>
  );
}
