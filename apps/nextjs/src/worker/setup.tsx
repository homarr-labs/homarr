"use client";

import { useEffect, useMemo, useState } from "react";
import {
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
import { IconAffiliate, IconLink, IconPlugConnected, IconUsers } from "@tabler/icons-react";

import type { ConnectionInput, SavedWorker } from "@homarr/worker-client";
import {
  browserCryptoAvailable,
  matchingSavedWorker,
  parseConnectionLink,
  validateConnectionAddress,
} from "@homarr/worker-client";

import { useWorkerConnections, useWorkerWorkspace } from "./context";
import { WorkerLocalAccounts, WorkerLocalLoginLink } from "./local-accounts";
import { WorkerMcp } from "./mcp";
import { errorMessage } from "./platform";
import { WorkerSharing } from "./sharing";
import { InlineConfirmation, InlinePanel, WorkerConsoleAppearance, WorkerCopyButton, workerConnectionKey } from "./ui";
import classes from "./worker-settings.module.css";

function connectionTab(value: string) {
  if (value === "overview") return "connection";
  return value;
}

export function WorkerSetup(props: { onClose: () => void; initialLink: string; initialTab: string }) {
  return (
    <WorkerConsoleAppearance>
      <WorkerSetupConsole {...props} />
    </WorkerConsoleAppearance>
  );
}

function WorkerSetupConsole({
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
  const [tab, setTab] = useState<string | null>(connectionTab(initialTab));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(Boolean(initialLink));
  const [forgetOpen, setForgetOpen] = useState(false);
  useEffect(() => setCryptoAvailable(browserCryptoAvailable()), []);
  useEffect(() => {
    if (!initialLink) return;
    setLink(initialLink);
    setReplaceOpen(true);
    setTab("connection");
  }, [initialLink]);
  useEffect(() => setTab(connectionTab(initialTab)), [initialTab]);
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
  let status = "Offline";
  let statusColor = "gray";
  if (selected?.connected) {
    status = "Connected";
    statusColor = "green";
  }

  async function action(execute: () => Promise<unknown>) {
    if (busy) return false;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await execute();
      return true;
    } catch (cause) {
      setError(errorMessage(cause));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function connectInput(input: ConnectionInput) {
    if (worker && input.workerId !== worker.workerId && !replaceConfirmed) {
      throw new Error("Confirm that you want to replace this worker first.");
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
    <Stack gap="md" className={classes.formFields}>
      <Text size="sm" c="dimmed" className={classes.prose}>
        Paste the setup, sign-in or invitation link from your worker. This private link contains your access.
      </Text>
      {!cryptoAvailable && <Alert color="yellow">Open Homarr using HTTPS or localhost to connect securely.</Alert>}
      <form onSubmit={(event) => void connect(event)}>
        <Stack gap="md">
          <Textarea
            label="Private connection link"
            placeholder="Paste the complete link from your worker"
            required
            minRows={2}
            autosize
            maxRows={5}
            value={link}
            onChange={(event) => setLink(event.currentTarget.value)}
            autoComplete="off"
            data-private="true"
            spellCheck={false}
            disabled={busy}
          />
          {replacing && (
            <Checkbox
              checked={replaceConfirmed}
              onChange={(event) => setReplaceConfirmed(event.currentTarget.checked)}
              label={`Replace ${worker?.name} with this worker`}
              description="If the new connection fails, your current worker stays connected. Its saved access is retained in this browser."
              disabled={busy}
            />
          )}
          {!localLogin && (
            <Group gap="sm">
              <Button
                type="submit"
                loading={busy}
                disabled={!cryptoAvailable || !link.trim() || (replacing && !replaceConfirmed)}
              >
                {replacing ? "Replace and connect" : "Connect worker"}
              </Button>
              {worker && (
                <Button
                  variant="default"
                  disabled={busy}
                  onClick={() => {
                    setReplaceOpen(false);
                    setLink("");
                    setError("");
                  }}
                >
                  Cancel
                </Button>
              )}
            </Group>
          )}
        </Stack>
      </form>
      {(!replacing || replaceConfirmed) && <WorkerLocalLoginLink link={link} onConnect={connectInput} />}
      {localLogin && worker && (
        <Group>
          <Button
            variant="default"
            onClick={() => {
              setReplaceOpen(false);
              setLink("");
            }}
          >
            Cancel
          </Button>
        </Group>
      )}
    </Stack>
  );

  if (!worker)
    return (
      <Stack gap="lg" maw={720}>
        <div>
          <Title order={2} size="h3">
            Connect your worker
          </Title>
          <Text size="sm" c="dimmed" mt={4}>
            Your worker stores your boards, integrations and widgets.
          </Text>
        </div>
        {error && (
          <Alert color="red" role="alert">
            {error}
          </Alert>
        )}
        {connectionForm}
      </Stack>
    );

  let address = worker.relayUrl;
  let route = "Encrypted relay";
  if (worker.mode === "direct") {
    address = worker.directUrl;
    route = "Direct connection";
  }
  const panelKey = connection && workerConnectionKey(connection);

  return (
    <Stack gap="lg">
      <div className={classes.summary}>
        <div className={classes.summaryIdentity}>
          <Group gap="sm">
            <Title order={2} className={classes.workerName}>
              {worker.name}
            </Title>
            <Badge variant="light" color={statusColor}>
              {status}
            </Badge>
          </Group>
        </div>
        <Button
          variant="default"
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
      </div>
      {selected?.error && (
        <Alert color="red" role="alert">
          {selected.error}
        </Alert>
      )}
      {error && (
        <Alert color="red" role="alert">
          {error}
        </Alert>
      )}
      {notice && (
        <Text component="output" size="sm" c="green">
          {notice}
        </Text>
      )}
      <Tabs value={tab} onChange={setTab} keepMounted={false}>
        <Tabs.List className={classes.tabs}>
          <Tabs.Tab
            className={classes.tab}
            value="connection"
            leftSection={<IconPlugConnected className={classes.tabIcon} size={16} />}
          >
            Connection
          </Tabs.Tab>
          <Tabs.Tab
            className={classes.tab}
            value="users"
            leftSection={<IconUsers className={classes.tabIcon} size={16} />}
          >
            Users
          </Tabs.Tab>
          <Tabs.Tab
            className={classes.tab}
            value="sharing"
            leftSection={<IconLink className={classes.tabIcon} size={16} />}
          >
            Sharing
          </Tabs.Tab>
          <Tabs.Tab
            className={classes.tab}
            value="mcp"
            leftSection={<IconAffiliate className={classes.tabIcon} size={16} />}
          >
            MCP
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="connection" className={classes.tabPanel}>
          <Stack gap="xl">
            {replaceOpen && initialLink && <InlinePanel title="Use this connection link">{connectionForm}</InlinePanel>}
            <ConnectionSettings
              key={`${worker.workerId}:${worker.mode}:${worker.directUrl}:${worker.relayUrl}:${worker.name}`}
              worker={worker}
              route={route}
              address={address}
              apply={async (input) =>
                action(async () => {
                  await pool.connectInput(input);
                  setNotice("Connection updated.");
                })
              }
            />
            <Divider />
            <section>
              <Stack gap="md">
                <div>
                  <Title order={3} size="h4" className={classes.sectionHeading}>
                    This browser
                  </Title>
                  <Text size="sm" c="dimmed" className={classes.prose}>
                    Your saved device key gives this browser{" "}
                    <Text span inherit fw={600}>
                      {worker.grant.role}
                    </Text>{" "}
                    access.
                    {worker.grant.expiresAt && ` It expires ${new Date(worker.grant.expiresAt).toLocaleString()}.`}
                  </Text>
                </div>
                <Group gap="sm">
                  {selected?.connected && (
                    <Button variant="default" disabled={busy} onClick={() => pool.disconnect(worker.workerId)}>
                      Disconnect
                    </Button>
                  )}
                  {!selected?.connected && (
                    <Button
                      variant="default"
                      loading={busy}
                      onClick={() => void action(() => pool.restore(worker.workerId))}
                    >
                      Reconnect
                    </Button>
                  )}
                  <Button
                    variant="subtle"
                    color="red"
                    disabled={busy}
                    onClick={() => setForgetOpen(true)}
                    aria-expanded={forgetOpen}
                  >
                    Forget saved access
                  </Button>
                </Group>
                {forgetOpen && (
                  <InlineConfirmation
                    title="Forget this browser’s access?"
                    description="This removes the saved device key from this browser. You will need a new invitation or a sign-in link to connect again. Worker data and other devices are kept."
                    action="Forget saved access"
                    busy={busy}
                    onCancel={() => setForgetOpen(false)}
                    onConfirm={() => void action(() => pool.forget(worker.workerId))}
                  />
                )}
              </Stack>
            </section>
            <details className={classes.details}>
              <summary>Worker identity and replacement</summary>
              <Stack gap="lg" className={classes.detailsContent}>
                <div>
                  <Text size="sm" fw={500} mb={4}>
                    Verified worker identity
                  </Text>
                  <Code block className={classes.address} style={{ whiteSpace: "pre-wrap" }}>
                    {worker.workerId}
                  </Code>
                  <Text size="xs" c="dimmed" mt="xs">
                    Changing the connection address must still prove this same worker identity.
                  </Text>
                </div>
                {!replaceOpen && (
                  <Group>
                    <Button
                      variant="default"
                      disabled={busy}
                      onClick={() => setReplaceOpen(true)}
                      aria-expanded={replaceOpen}
                    >
                      Replace worker
                    </Button>
                  </Group>
                )}
                {replaceOpen && !initialLink && (
                  <InlinePanel title="Connect a different worker">{connectionForm}</InlinePanel>
                )}
              </Stack>
            </details>
          </Stack>
        </Tabs.Panel>
        <Tabs.Panel value="users" className={classes.tabPanel}>
          {connection && (
            <WorkerLocalAccounts key={`${worker.workerId}:${panelKey}`} worker={worker} connection={connection} />
          )}
          {!connection && (
            <ConnectionRequired action={() => setTab("connection")} text="Reconnect your worker to manage users." />
          )}
        </Tabs.Panel>
        <Tabs.Panel value="sharing" className={classes.tabPanel}>
          {connection && <WorkerSharing worker={worker} connection={connection} />}
          {!connection && (
            <ConnectionRequired
              action={() => setTab("connection")}
              text="Reconnect your worker to manage board links and devices."
            />
          )}
        </Tabs.Panel>
        <Tabs.Panel value="mcp" className={classes.tabPanel}>
          {connection && (
            <WorkerMcp
              key={`${worker.workerId}:${panelKey}:${organizationId ?? "personal"}`}
              worker={worker}
              connection={connection}
            />
          )}
          {!connection && (
            <ConnectionRequired
              action={() => setTab("connection")}
              text="Reconnect your worker to manage MCP access."
            />
          )}
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

function ConnectionRequired({ action, text }: { action: () => void; text: string }) {
  return (
    <Stack gap="md">
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
  route,
  address,
  apply,
}: {
  worker: SavedWorker;
  route: string;
  address: string;
  apply: (input: ConnectionInput) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState(worker.mode);
  const [name, setName] = useState(worker.name);
  const [directUrl, setDirectUrl] = useState(worker.directUrl);
  const [relayUrl, setRelayUrl] = useState(worker.relayUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      let nextAddress = relayUrl;
      if (mode === "direct") nextAddress = directUrl;
      validateConnectionAddress(mode, nextAddress.trim());
      const saved = await apply({
        ...worker,
        name: name.trim(),
        mode,
        directUrl: directUrl.trim(),
        relayUrl: relayUrl.trim(),
      });
      if (saved) setEditing(false);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <Stack gap="md">
        <div className={classes.sectionHeader}>
          <div>
            <Title order={3} size="h4" className={classes.sectionHeading}>
              How you connect
            </Title>
            <Text size="sm" c="dimmed">
              {route}
            </Text>
          </div>
          {!editing && (
            <Button variant="default" size="sm" onClick={() => setEditing(true)} aria-expanded={editing}>
              Change connection
            </Button>
          )}
        </div>
        {!editing && (
          <Group gap="sm" align="flex-start">
            <Text size="sm" className={classes.address} style={{ flex: 1, minWidth: 0, paddingTop: 8 }}>
              {address}
            </Text>
            <WorkerCopyButton value={address} label="Copy address" variant="subtle" />
          </Group>
        )}
        <Text size="sm" c="dimmed" className={classes.prose}>
          The address locates your worker. Your device key authorizes access, even when the address is on the public
          web.
        </Text>
        {editing && (
          <InlinePanel title="Change connection">
            <Text size="sm" c="dimmed" className={classes.prose}>
              Use this when the worker moves or you switch connection methods. Homarr will verify the same worker
              identity.
            </Text>
            <form onSubmit={(event) => void save(event)}>
              <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                <Stack gap="md" className={classes.formFields}>
                  <TextInput
                    label="Name in this browser"
                    value={name}
                    onChange={(event) => setName(event.currentTarget.value)}
                    required
                    maxLength={100}
                  />
                  <NativeSelect
                    label="Connection method"
                    value={mode}
                    onChange={(event) => {
                      if (event.currentTarget.value === "direct" || event.currentTarget.value === "relay")
                        setMode(event.currentTarget.value);
                    }}
                    data={[
                      { value: "direct", label: "Direct · HTTPS or Tailscale" },
                      { value: "relay", label: "Encrypted Homarr relay" },
                    ]}
                  />
                  {mode === "direct" && (
                    <TextInput
                      label="Worker address"
                      value={directUrl}
                      onChange={(event) => setDirectUrl(event.currentTarget.value)}
                      required
                      spellCheck={false}
                      autoComplete="off"
                      description="This browser must be able to reach the worker’s network."
                    />
                  )}
                  {mode === "relay" && (
                    <TextInput
                      label="Relay address"
                      value={relayUrl}
                      onChange={(event) => setRelayUrl(event.currentTarget.value)}
                      required
                      spellCheck={false}
                      autoComplete="off"
                    />
                  )}
                  {error && (
                    <Text size="sm" c="red" role="alert">
                      {error}
                    </Text>
                  )}
                  <Group gap="sm">
                    <Button type="submit" size="sm" loading={busy}>
                      Save and reconnect
                    </Button>
                    <Button variant="default" size="sm" onClick={() => setEditing(false)} disabled={busy}>
                      Cancel
                    </Button>
                  </Group>
                </Stack>
              </fieldset>
            </form>
          </InlinePanel>
        )}
      </Stack>
    </section>
  );
}
