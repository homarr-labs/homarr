"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Checkbox,
  Code,
  Divider,
  Group,
  NativeSelect,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { IconAffiliate, IconDashboard, IconKey, IconPlugConnected, IconUsers } from "@tabler/icons-react";

import type { ConnectionInput, SavedWorker } from "@homarr/worker-client";
import {
  browserCryptoAvailable,
  matchingSavedWorker,
  parseConnectionLink,
  validateConnectionAddress,
} from "@homarr/worker-client";

import { useWorkerConnections, useWorkerWorkspace } from "./context";
import { WorkerAccount, errorMessage } from "./platform";
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
  const [link, setLink] = useState(initialLink);
  const [cryptoAvailable, setCryptoAvailable] = useState(false);
  const [tab, setTab] = useState<string | null>(initialTab);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const [forgetConfirmed, setForgetConfirmed] = useState(false);
  useEffect(() => setCryptoAvailable(browserCryptoAvailable()), []);
  useEffect(() => {
    if (initialLink) setLink(initialLink);
  }, [initialLink]);
  useEffect(() => setTab(initialTab), [initialTab]);
  useEffect(() => setReplaceConfirmed(false), [link]);
  const selected =
    snapshot.workers.find(({ worker }) => worker.workerId === snapshot.primaryWorkerId) ?? snapshot.workers[0];
  const worker = selected?.worker;
  const connection = useMemo(() => {
    if (!selected?.connected) return null;
    return pool.getConnection(selected.worker.workerId);
  }, [pool, selected]);
  const incoming = useMemo(() => {
    if (!link) return null;
    try {
      return parseConnectionLink(link);
    } catch {
      return null;
    }
  }, [link]);
  const replacing = Boolean(worker && incoming && incoming.workerId !== worker.workerId);
  const localLogin = incoming?.credential.kind === "local-register" || incoming?.credential.kind === "local-login";
  let status = "Not connected";
  let statusColor = "gray";
  if (selected?.connected) {
    status = "Connected";
    statusColor = "green";
  } else if (worker) status = "Offline";

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
    if (worker && input.workerId !== worker.workerId && !replaceConfirmed) {
      throw new Error("Confirm that you want to replace the connected worker first.");
    }
    const saved = matchingSavedWorker(
      snapshot.workers.map((entry) => entry.worker),
      input,
    );
    const restoreSaved =
      input.credential.kind === "claim" || input.credential.kind === "grant" || input.credential.kind === "invite";
    if (saved && restoreSaved) await pool.restore(saved.workerId);
    else await pool.connectInput(input);
    setLink("");
    onClose();
  }
  async function connect(event: React.FormEvent) {
    event.preventDefault();
    await action(() => connectInput(parseConnectionLink(link, window.location.origin)));
  }
  const connectionForm = (
    <Stack gap="md" maw={720}>
      <div>
        <Title order={3}>{worker ? "Replace worker" : "Connect your worker"}</Title>
        <Text c="dimmed" size="sm" mt={4}>
          Your worker stores your boards, integrations and widgets. Paste its setup, sign-in or invitation link.
        </Text>
      </div>
      {!cryptoAvailable && <Alert color="yellow">Open Homarr using HTTPS or localhost to connect securely.</Alert>}
      <form onSubmit={(event) => void connect(event)}>
        <Stack gap="sm">
          <Textarea
            label="Private connection link"
            placeholder="Paste the complete link from your worker"
            required
            minRows={3}
            value={link}
            onChange={(event) => setLink(event.currentTarget.value)}
            autoComplete="off"
            data-private="true"
            spellCheck={false}
          />
          {replacing && (
            <Checkbox
              checked={replaceConfirmed}
              onChange={(event) => setReplaceConfirmed(event.currentTarget.checked)}
              label={`Use this worker instead of ${worker?.name}`}
              description="Your current worker stays connected if the new connection fails. Its saved access is retained in this browser."
            />
          )}
          {!localLogin && (
            <Group>
              <Button
                type="submit"
                loading={busy}
                disabled={!cryptoAvailable || !link.trim() || (replacing && !replaceConfirmed)}
              >
                {replacing ? "Replace and connect" : "Connect worker"}
              </Button>
            </Group>
          )}
        </Stack>
      </form>
      {(!replacing || replaceConfirmed) && <WorkerLocalLoginLink link={link} onConnect={connectInput} />}
    </Stack>
  );
  let overview = connectionForm;
  if (worker)
    overview = (
      <Stack gap="lg" maw={720}>
        <div>
          <Group justify="space-between" gap="sm">
            <Title order={3} style={{ overflowWrap: "anywhere" }}>
              {worker.name}
            </Title>
            <Badge color={statusColor} variant="light">
              {status}
            </Badge>
          </Group>
          <Text size="sm" c="dimmed" mt="xs">
            Your boards, integrations and widgets run on this worker.
          </Text>
        </div>
        {selected?.error && (
          <Alert color="red" role="alert">
            {selected.error}
          </Alert>
        )}
        <Group>
          <Button
            loading={busy}
            onClick={() =>
              void action(async () => {
                if (!selected?.connected) await pool.restore(worker.workerId);
                onClose();
              })
            }
          >
            Open boards
          </Button>
          <Button variant="default" onClick={() => setTab("connection")}>
            Connection settings
          </Button>
        </Group>
        <Divider />
        <Stack gap="xs">
          <Text size="sm" fw={600}>
            This browser’s access
          </Text>
          <Text size="sm" tt="capitalize">
            {worker.grant.role}
          </Text>
          <Text size="sm" c="dimmed">
            Manage people in Users, create private links in Sharing, or approve assistant access in MCP.
          </Text>
        </Stack>
        <Accordion variant="default">
          <Accordion.Item value="identity">
            <Accordion.Control>Worker identity</Accordion.Control>
            <Accordion.Panel>
              <Text size="sm" c="dimmed" mb="xs">
                Use this identifier to check which worker you connected.
              </Text>
              <Code block style={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
                {worker.workerId}
              </Code>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Stack>
    );
  return (
    <Stack gap="lg">
      <Text size="sm" c="dimmed">
        One worker powers this Homarr workspace.
      </Text>
      <Tabs value={tab} onChange={setTab} keepMounted={false}>
        <Tabs.List style={{ flexWrap: "wrap" }}>
          <Tabs.Tab value="overview" leftSection={<IconDashboard size={16} />}>
            Overview
          </Tabs.Tab>
          <Tabs.Tab value="users" leftSection={<IconUsers size={16} />}>
            Users
          </Tabs.Tab>
          <Tabs.Tab value="sharing" leftSection={<IconKey size={16} />}>
            Sharing
          </Tabs.Tab>
          <Tabs.Tab value="connection" leftSection={<IconPlugConnected size={16} />}>
            Connection
          </Tabs.Tab>
          <Tabs.Tab value="mcp" leftSection={<IconAffiliate size={16} />}>
            MCP
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="overview" pt="lg">
          {overview}
        </Tabs.Panel>
        <Tabs.Panel value="users" pt="lg">
          {connection && worker && (
            <WorkerLocalAccounts key={worker.workerId} worker={worker} connection={connection} />
          )}
          {!connection && (
            <ConnectionRequired
              action={() => setTab("connection")}
              text="Connect your worker to manage users and invitations."
            />
          )}
        </Tabs.Panel>
        <Tabs.Panel value="sharing" pt="lg">
          {connection && worker && <WorkerSharing worker={worker} connection={connection} />}
          {!connection && (
            <ConnectionRequired
              action={() => setTab("connection")}
              text="Connect your worker to manage private sharing links."
            />
          )}
        </Tabs.Panel>
        <Tabs.Panel value="connection" pt="lg">
          <Stack gap="xl">
            {worker && (
              <ConnectionSettings
                key={worker.workerId}
                worker={worker}
                busy={busy}
                apply={(input) =>
                  action(async () => {
                    await pool.connectInput(input);
                    setNotice("Connection saved.");
                  })
                }
              />
            )}
            {worker && <Divider />}
            {connectionForm}
            {worker && (
              <Accordion variant="default" maw={720}>
                <Accordion.Item value="browser-access">
                  <Accordion.Control>Browser access</Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap="sm">
                      <Text size="sm" c="dimmed">
                        Disconnect to close the current session. Forgetting removes this worker’s saved access from this
                        browser; it does not delete worker data.
                      </Text>
                      <Group>
                        <Button
                          variant="default"
                          disabled={!selected?.connected || busy}
                          onClick={() => pool.disconnect(worker.workerId)}
                        >
                          Disconnect
                        </Button>
                      </Group>
                      <Checkbox
                        checked={forgetConfirmed}
                        onChange={(event) => setForgetConfirmed(event.currentTarget.checked)}
                        label="Remove this worker’s saved access from this browser"
                      />
                      <Group>
                        <Button
                          variant="light"
                          color="red"
                          loading={busy}
                          disabled={!forgetConfirmed}
                          onClick={() => void action(() => pool.forget(worker.workerId))}
                        >
                          Forget worker
                        </Button>
                      </Group>
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            )}
          </Stack>
        </Tabs.Panel>
        <Tabs.Panel value="mcp" pt="lg">
          <Stack gap="lg">
            <Accordion variant="default">
              <Accordion.Item value="cloud-account">
                <Accordion.Control>Cloud account · optional</Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" c="dimmed" mb="md">
                    Sign in for hosted MCP access.
                  </Text>
                  <WorkerAccount />
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
            {connection && worker && (
              <WorkerMcp
                key={`${worker.workerId}:${organizationId ?? "personal"}`}
                worker={worker}
                connection={connection}
              />
            )}
            {!connection && (
              <ConnectionRequired
                action={() => setTab("connection")}
                text="Connect your worker to approve MCP access."
              />
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>
      {error && (
        <Alert color="red" role="alert">
          {error}
        </Alert>
      )}
      {notice && (
        <Alert color="green" aria-live="polite">
          {notice}
        </Alert>
      )}
    </Stack>
  );
}

function ConnectionRequired({ action, text }: { action: () => void; text: string }) {
  return (
    <Stack gap="sm">
      <Text c="dimmed" size="sm">
        {text}
      </Text>
      <Group>
        <Button variant="default" onClick={action}>
          Connection settings
        </Button>
      </Group>
    </Stack>
  );
}

function ConnectionSettings({
  worker,
  apply,
  busy,
}: {
  worker: SavedWorker;
  apply: (input: ConnectionInput) => Promise<void>;
  busy: boolean;
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
      let address = relayUrl;
      if (mode === "direct") address = directUrl;
      validateConnectionAddress(mode, address);
      await apply({ ...worker, name, mode, directUrl, relayUrl });
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }
  return (
    <form onSubmit={(event) => void save(event)}>
      <Stack gap="md" maw={720}>
        <Title order={3}>Connection settings</Title>
        <TextInput label="Worker name" value={name} onChange={(event) => setName(event.currentTarget.value)} required />
        <NativeSelect
          label="Connection method"
          value={mode}
          onChange={(event) => setMode(event.currentTarget.value as "direct" | "relay")}
          data={[
            { value: "relay", label: "Homarr relay" },
            { value: "direct", label: "Direct or Tailscale" },
          ]}
        />
        {mode === "direct" && (
          <TextInput
            label="Worker URL"
            value={directUrl}
            onChange={(event) => setDirectUrl(event.currentTarget.value)}
            required
          />
        )}
        {mode === "relay" && (
          <TextInput
            label="Relay URL"
            value={relayUrl}
            onChange={(event) => setRelayUrl(event.currentTarget.value)}
            required
          />
        )}
        <Text size="sm" c="dimmed">
          This controls how your browser reaches the worker. Hosted MCP uses the Homarr relay.
        </Text>
        <Group>
          <Button type="submit" variant="default" loading={busy}>
            Save and reconnect
          </Button>
        </Group>
        {error && (
          <Alert color="red" role="alert">
            {error}
          </Alert>
        )}
      </Stack>
    </form>
  );
}
