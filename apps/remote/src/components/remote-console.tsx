import { Alert, Button, Group, Loader, Modal, NativeSelect, Paper, Stack, Text, TextInput, Title } from "@mantine/core";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type {
  EnrollmentChallenge,
  PlatformSession,
  WorkerConnection as DirectoryWorker,
  WorkerEnrollment,
} from "@homarr/remote-platform/types";
import type { ConnectionInput, SavedWorker, WorkerConnection } from "../lib/connection";
import {
  browserCryptoAvailable,
  matchingSavedWorker,
  openWorker,
  parseConnectionLink,
  secureConnectionMessage,
  validateConnectionAddress,
  workerRequest,
} from "../lib/connection";
import { appHome, appUrl } from "../lib/base-path";
import { errorMessage, platformRequest } from "../lib/platform";
import { clearPendingConnection, readPendingConnection, rememberPendingConnection } from "../lib/pending-connection";
import { forgetWorker, readWorkers, saveWorker } from "../lib/vault";
import { AccountPanel } from "./account-panel";
import { BoardView } from "./board-view";
import type { BoardSummary } from "./board-view";
import { ConnectModal } from "./connect-modal";
import { Glyph, Mark } from "./icons";

const AccessPanel = lazy(() => import("./worker-access").then((module) => ({ default: module.WorkerAccess })));
type Tab = "workers" | "access" | "account";
type LiveWorker = { worker: SavedWorker; connection: WorkerConnection; boards: BoardSummary[] };
const signedOut: PlatformSession = { user: null, csrfToken: null };

export function RemoteConsole() {
  const [tab, setTab] = useState<Tab>("workers");
  const [session, setSession] = useState<PlatformSession>(signedOut);
  const [directory, setDirectory] = useState<DirectoryWorker[]>([]);
  const [saved, setSaved] = useState<SavedWorker[]>([]);
  const [live, setLive] = useState<LiveWorker | null>(null);
  const [loading, setLoading] = useState(true);
  const [cryptoAvailable, setCryptoAvailable] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState(false);
  const [settingsWorker, setSettingsWorker] = useState<SavedWorker | null>(null);
  const [initialLink, setInitialLink] = useState("");
  const [shared, setShared] = useState(false);
  const [storageError, setStorageError] = useState("");
  const liveRef = useRef<LiveWorker | null>(null);
  const generation = useRef(0);
  const started = useRef(false);
  const pendingShare = useRef<ConnectionInput | null>(null);

  async function refreshAccount() {
    const nextSession = await platformRequest<PlatformSession>("/api/session");
    setSession(nextSession);
    if (nextSession.user) {
      const { workers } = await platformRequest<{ workers: DirectoryWorker[] }>("/api/workers", nextSession);
      setDirectory(workers);
    } else setDirectory([]);
  }

  useEffect(() => {
    setCryptoAvailable(browserCryptoAvailable());
    let disposed = false;
    let linkSequence = 0;
    function consumePrivateLink() {
      if (window.location.hash.length > 1) {
        linkSequence += 1;
        const privateLink = window.location.href;
        pendingShare.current = null;
        clearPendingConnection();
        setInitialLink("");
        setModal(false);
        try {
          const input = parseConnectionLink(privateLink);
          if (input.credential.kind === "share") {
            // Shared capabilities stay in the fragment so bookmarks and reloads work.
            // HTTP requests use explicit API paths and a no-referrer policy.
            pendingShare.current = input;
            setInitialLink("");
          } else {
            rememberPendingConnection(privateLink);
            window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
            setInitialLink(privateLink);
            setShared(false);
            setModal(true);
          }
        } catch (cause) {
          window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
          setError(errorMessage(cause));
        }
      } else {
        const pending = readPendingConnection();
        if (pending) {
          setInitialLink(pending);
          setShared(false);
          setModal(true);
        }
      }
      const input = pendingShare.current;
      if (!input) return;
      const sequence = ++linkSequence;
      setShared(true);
      void readWorkers<SavedWorker>()
        .catch(() => [])
        .then((workers) => {
          if (disposed || sequence !== linkSequence) return;
          const known = workers.find((worker) => worker.workerId === input.workerId);
          if (known) input.deviceIdentity = known.deviceIdentity;
          void connect(input, true);
        });
    }
    window.addEventListener("hashchange", consumePrivateLink);
    consumePrivateLink();
    if (!started.current) {
      started.current = true;
      const storage = readWorkers<SavedWorker>()
        .then(setSaved)
        .catch((cause) => setStorageError(errorMessage(cause)));
      const account = refreshAccount().catch(() =>
        setNotice("The account service is unavailable. You can still connect directly to your worker."),
      );
      void Promise.allSettled([storage, account]).then(() => setLoading(false));
    }
    return () => {
      disposed = true;
      window.removeEventListener("hashchange", consumePrivateLink);
      generation.current += 1;
      liveRef.current?.connection.close();
    };
  }, []);

  useEffect(() => {
    const expiresAt = live?.worker.grant.expiresAt;
    if (!expiresAt) return;
    const remaining = expiresAt - Date.now();
    if (remaining > 2_147_000_000) return;
    const timeout = setTimeout(
      () => {
        generation.current += 1;
        liveRef.current?.connection.close();
        liveRef.current = null;
        setLive(null);
        setNotice("This worker access has expired. Ask its owner for a new private link.");
      },
      Math.max(0, remaining),
    );
    return () => clearTimeout(timeout);
  }, [live]);

  async function connect(input: ConnectionInput, isShare = false, useInvitation = false) {
    const current = ++generation.current;
    liveRef.current?.connection.close();
    liveRef.current = null;
    setLive(null);
    setBusy(true);
    setError("");
    setNotice("");
    let attempt: WorkerConnection | undefined;
    const pendingAtStart = readPendingConnection();
    try {
      if (input.credential.kind === "claim" || input.credential.kind === "invite") {
        const known = matchingSavedWorker(await readWorkers<SavedWorker>(), input);
        if (known) {
          input = { ...input, deviceIdentity: known.deviceIdentity };
          if (!useInvitation) input.credential = known.credential;
        }
      }
      const { worker, connection } = await openWorker(input, () => {
        if (generation.current === current) {
          liveRef.current = null;
          setLive(null);
          setNotice("The worker disconnected. Reconnect when it is available.");
        }
      });
      attempt = connection;
      // Authorization must survive failures while loading board data, or a stale UI attempt.
      if (!isShare) {
        await saveWorker(worker);
        setSaved((workers) => [...workers.filter((item) => item.workerId !== worker.workerId), worker]);
        setStorageError("");
        if (generation.current === current && readPendingConnection() === pendingAtStart) clearPendingConnection();
      }
      if (generation.current !== current) {
        connection.close();
        return;
      }
      const info = await workerRequest<{ workerId: string; name: string }>(connection, "/remote/info");
      if (info.workerId !== worker.workerId) {
        connection.close();
        throw new Error("The worker identity did not match this connection.");
      }
      if (!input.name || input.name === "My Homarr") {
        worker.name = info.name;
        if (!isShare) {
          await saveWorker(worker);
          setSaved((workers) => [...workers.filter((item) => item.workerId !== worker.workerId), worker]);
        }
      }
      const { boards } = await workerRequest<{ boards: BoardSummary[] }>(connection, "/remote/boards");
      if (generation.current !== current) {
        connection.close();
        return;
      }
      const next = { worker, connection, boards };
      liveRef.current = next;
      setLive(next);
      setShared(isShare);
      setModal(false);
      setInitialLink("");
      clearPendingConnection();
      pendingShare.current = null;
      setTab("workers");
    } catch (cause) {
      attempt?.close();
      if (generation.current === current) setError(errorMessage(cause));
    } finally {
      if (generation.current === current) setBusy(false);
    }
  }

  function openConnectionDialog() {
    setInitialLink(readPendingConnection());
    setError("");
    setModal(true);
  }

  function disconnect() {
    if (window.location.hash)
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    pendingShare.current = null;
    generation.current += 1;
    liveRef.current?.connection.close();
    liveRef.current = null;
    setLive(null);
    setShared(false);
  }
  async function forget(workerId: string) {
    setError("");
    try {
      await forgetWorker(workerId);
      setSaved((workers) => workers.filter((worker) => worker.workerId !== workerId));
      if (live?.worker.workerId === workerId) disconnect();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }
  async function enroll() {
    if (!live || !session.user) return;
    setBusy(true);
    setError("");
    try {
      const { challenge } = await platformRequest<{ challenge: EnrollmentChallenge }>(
        "/api/workers/challenge",
        session,
        { method: "POST" },
      );
      const proof = await workerRequest<
        Pick<WorkerEnrollment, "workerId" | "workerPublicKey" | "workerSigningKey" | "signature">
      >(live.connection, "/remote/platform-enrollment", { method: "POST", body: JSON.stringify({ challenge }) });
      await platformRequest("/api/workers", session, {
        method: "POST",
        body: JSON.stringify({
          ...proof,
          challenge,
          name: live.worker.name,
          mode: live.worker.mode,
          relayUrl: live.worker.relayUrl || null,
          directUrl: live.worker.directUrl || null,
        }),
      });
      await refreshAccount();
      setNotice("Worker added to your account directory. Its private access stays in this browser.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function saveConnectionSettings(worker: SavedWorker) {
    if (!worker.name.trim()) throw new Error("Enter a worker name.");
    let address = worker.relayUrl;
    if (worker.mode === "direct") address = worker.directUrl;
    validateConnectionAddress(worker.mode, address);
    await saveWorker(worker);
    setSaved((workers) => workers.map((item) => (item.workerId === worker.workerId ? worker : item)));
    const accountWorker = directory.find((item) => item.workerId === worker.workerId);
    if (accountWorker && session.user) {
      try {
        await platformRequest(`/api/workers/${encodeURIComponent(worker.workerId)}`, session, {
          method: "PATCH",
          body: JSON.stringify({
            name: worker.name,
            mode: worker.mode,
            directUrl: worker.directUrl || null,
            relayUrl: worker.relayUrl || null,
          }),
        });
        await refreshAccount();
      } catch {
        setNotice("Connection settings saved on this device. The account directory could not be updated.");
        return;
      }
    }
    setNotice("Connection settings saved. Reconnect to use the new route.");
  }

  const allWorkers = [
    ...saved.map((worker) => ({
      workerId: worker.workerId,
      name: worker.name,
      mode: worker.mode,
      local: worker,
      directory: directory.find((item) => item.workerId === worker.workerId),
    })),
    ...directory
      .filter((worker) => !saved.some((item) => item.workerId === worker.workerId))
      .map((worker) => ({
        workerId: worker.workerId,
        name: worker.name,
        mode: worker.mode,
        local: undefined,
        directory: worker,
      })),
  ];
  const directoryWorker = directory.find((worker) => worker.workerId === live?.worker.workerId);
  let pageTitle = "Your servers. Anywhere.";
  let pageDescription = "Connect your Homarr workers and open your boards, wherever you are.";
  if (tab === "access") {
    pageTitle = "Access, on your terms.";
    pageDescription = "Share a board, invite a device, or bring someone into your worker's directory.";
  }
  if (tab === "account") {
    pageTitle = "Your account.";
    pageDescription = "A simple directory for your independent workers and the people you share them with.";
  }

  let connectionStatus = "Ready to connect";
  if (!cryptoAvailable) connectionStatus = "HTTPS required";
  if (live) connectionStatus = "Worker connected";

  if (shared)
    return (
      <div className="share-shell">
        <div className="shared-heading">
          <a className="brand" href={appHome}>
            <Mark small />
            <span>
              homarr <small>Shared privately</small>
            </span>
          </a>
          <Button variant="default" onClick={disconnect}>
            Close shared view
          </Button>
        </div>
        <ConnectionMap live={live} busy={busy} />
        {!cryptoAvailable && (
          <Alert color="yellow" mb="lg" title="Use the secure demo address">
            {secureConnectionMessage} <a href={appUrl("/try")}>See the demo steps</a>.
          </Alert>
        )}
        {error && (
          <Alert color="red" mb="lg" role="alert">
            {error}
          </Alert>
        )}
        {notice && <Alert mb="lg">{notice}</Alert>}
        {live && (
          <>
            <h1>{live.worker.name}</h1>
            <BoardView connection={live.connection} boards={live.boards} />
          </>
        )}
        {busy && (
          <Group className="state-message">
            <Loader size="sm" />
            <span>Opening the private board…</span>
          </Group>
        )}
      </div>
    );

  return (
    <div className="remote-shell">
      <aside className="sidebar">
        <a className="brand" href={appHome}>
          <Mark />
          <span>
            homarr<small>Remote</small>
          </span>
        </a>
        <nav className="nav-list" aria-label="Main navigation">
          <button className="nav-item" data-active={tab === "workers"} onClick={() => setTab("workers")}>
            <Glyph name="server" />
            Workers
          </button>
          <button className="nav-item" data-active={tab === "access"} onClick={() => setTab("access")}>
            <Glyph name="key" />
            Access
          </button>
          <button className="nav-item" data-active={tab === "account"} onClick={() => setTab("account")}>
            <Glyph name="user" />
            Account
          </button>
          <a className="nav-item" href={appUrl("/try")}>
            <Glyph name="arrow" />
            Try the demo
          </a>
        </nav>
        <div className="sidebar-note">
          <Glyph name="lock" size={18} />
          <strong>Your server stays yours.</strong>Private connections are encrypted from this browser to your worker.
        </div>
        <div className="sidebar-user">
          <span className="user-avatar">
            <Glyph name="user" size={16} />
          </span>
          <div>
            <span>{session.user?.name || session.user?.login || "This browser"}</span>
            <small>{session.user ? "Homarr account" : "Local connections"}</small>
          </div>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div className="breadcrumbs">
            <span>Homarr Remote</span>
            <span>/</span>
            <strong>{tab.charAt(0).toUpperCase() + tab.slice(1)}</strong>
          </div>
          <span className="topbar-tag">
            <span className={live ? "status-dot live" : "status-dot"} />
            {connectionStatus}
          </span>
        </div>
        <header className="heading-row">
          <div>
            <div className="eyebrow">Private by connection</div>
            <h1>{pageTitle}</h1>
            <p>{pageDescription}</p>
          </div>
          {tab === "workers" && (
            <Button
              leftSection={<Glyph name="plus" size={18} />}
              onClick={openConnectionDialog}
              size="md"
              disabled={!cryptoAvailable}
            >
              Connect worker
            </Button>
          )}
        </header>
        {!cryptoAvailable && (
          <Alert color="yellow" mb="lg" title="Use the secure demo address">
            {secureConnectionMessage} <a href={appUrl("/try")}>See the demo steps</a>.
          </Alert>
        )}
        {error && (
          <Alert
            color="red"
            mb="lg"
            role="alert"
            withCloseButton
            closeButtonLabel="Dismiss error"
            onClose={() => setError("")}
          >
            {error}
          </Alert>
        )}
        {notice && (
          <Alert
            className="notice"
            color="violet"
            withCloseButton
            closeButtonLabel="Dismiss notice"
            onClose={() => setNotice("")}
          >
            {notice}
          </Alert>
        )}
        {storageError && (
          <Alert color="yellow" mb="lg">
            {storageError} You can use a connection in this tab, but it may need pairing again after closing.
          </Alert>
        )}
        {tab === "workers" && (
          <>
            <ConnectionMap live={live} busy={busy} />
            <div className="section-title">
              <h2>Your workers</h2>
              <span>{allWorkers.length} saved connections</span>
            </div>
            {loading && (
              <Group className="state-message">
                <Loader size="xs" />
                <span>Loading your connections…</span>
              </Group>
            )}
            {!loading && !allWorkers.length && (
              <div className="empty-state">
                <div className="empty-icon">
                  <Glyph name="server" size={28} />
                </div>
                <h2>Connect your server.</h2>
                <p>
                  Open the private setup link from the demo launcher. You can try a board and share it without signing
                  in.
                </p>
                <Button
                  variant="light"
                  disabled={!cryptoAvailable}
                  onClick={openConnectionDialog}
                  leftSection={<Glyph name="link" size={17} />}
                >
                  Paste a connection link
                </Button>
                <Button component="a" href={appUrl("/try")} variant="subtle" mt="sm">
                  How to try the demo
                </Button>
              </div>
            )}
            <div className="workers-grid">
              {allWorkers.map((worker) => (
                <section
                  className="worker-card"
                  key={worker.workerId}
                  data-selected={live?.worker.workerId === worker.workerId}
                >
                  <div className="worker-card-header">
                    <div className="node-icon worker">
                      <Glyph name="server" />
                    </div>
                    <span className="pill" data-live={live?.worker.workerId === worker.workerId}>
                      {live?.worker.workerId === worker.workerId ? "Connected" : "Saved"}
                    </span>
                  </div>
                  <div>
                    <h3>{worker.name}</h3>
                    <div className="worker-id mono">{worker.workerId.slice(0, 22)}…</div>
                  </div>
                  <div className="worker-card-footer">
                    <span>{worker.mode === "direct" ? "Direct connection" : "Encrypted relay"}</span>
                    {worker.local && (
                      <Button
                        size="compact-xs"
                        variant="subtle"
                        onClick={() => setSettingsWorker(worker.local ?? null)}
                      >
                        Settings
                      </Button>
                    )}
                    <Button
                      size="xs"
                      variant="light"
                      loading={busy && !live}
                      disabled={busy}
                      onClick={() => {
                        if (worker.local) void connect(worker.local);
                        else {
                          openConnectionDialog();
                        }
                      }}
                    >
                      {worker.local ? "Open" : "Pair device"}
                    </Button>
                  </div>
                </section>
              ))}
            </div>
            {live && (
              <section className="detail-section">
                <div className="detail-header">
                  <div>
                    <h2>{live.worker.name}</h2>
                    <p>Live from your worker · {live.worker.grant.role} access</p>
                  </div>
                  <Group gap="xs">
                    <Button
                      size="xs"
                      variant="light"
                      onClick={() => setTab("access")}
                      leftSection={<Glyph name="key" size={14} />}
                    >
                      Manage access
                    </Button>
                    <Button size="xs" variant="default" onClick={disconnect}>
                      Disconnect
                    </Button>
                  </Group>
                </div>
                <BoardView key={live.worker.workerId} connection={live.connection} boards={live.boards} />
                <WorkerSettings
                  worker={live.worker}
                  onSave={saveConnectionSettings}
                  onForget={() => forget(live.worker.workerId)}
                />
                {session.user && !directoryWorker && live.worker.grant.role === "owner" && (
                  <Paper className="panel" withBorder mt="xl">
                    <Group justify="space-between">
                      <div>
                        <Title order={3}>Keep this worker in your account.</Title>
                        <Text size="sm" c="dimmed" mt="xs">
                          Save its public connection details to your directory.
                        </Text>
                      </div>
                      <Button onClick={enroll} loading={busy}>
                        Add to account
                      </Button>
                    </Group>
                  </Paper>
                )}
              </section>
            )}
          </>
        )}
        {tab === "access" && (
          <>
            {live && (
              <Suspense fallback={<Loader size="sm" />}>
                <AccessPanel
                  worker={live.worker}
                  connection={live.connection}
                  boards={live.boards}
                  session={session}
                  directoryWorker={directoryWorker}
                />
              </Suspense>
            )}
            {!live && (
              <div className="empty-state">
                <div className="empty-icon">
                  <Glyph name="key" size={28} />
                </div>
                <h2>Open a worker to manage access.</h2>
                <p>Private links and device permissions are managed by your worker through an encrypted connection.</p>
                <Button variant="light" onClick={() => setTab("workers")}>
                  Choose a worker
                </Button>
              </div>
            )}
          </>
        )}
        {tab === "account" && <AccountPanel session={session} workers={directory} refresh={refreshAccount} />}
      </main>
      <Modal
        opened={!!settingsWorker}
        onClose={() => setSettingsWorker(null)}
        title="Worker connection settings"
        size="lg"
        centered
        closeButtonProps={{ "aria-label": "Close connection settings" }}
      >
        {settingsWorker && (
          <WorkerSettings
            key={settingsWorker.workerId}
            expanded
            worker={settingsWorker}
            onSave={async (worker) => {
              await saveConnectionSettings(worker);
              setSettingsWorker(null);
            }}
            onForget={async () => {
              await forget(settingsWorker.workerId);
              setSettingsWorker(null);
            }}
          />
        )}
      </Modal>
      <ConnectModal
        opened={modal}
        onClose={() => setModal(false)}
        initial={initialLink}
        savedWorkers={saved}
        onConnect={async (input, useInvitation) => {
          await connect(input, input.credential.kind === "share", useInvitation);
        }}
        onReplace={() => {
          clearPendingConnection();
          setInitialLink("");
          setError("");
        }}
        busy={busy}
        connectionError={error}
        connectionSupported={cryptoAvailable}
      />
    </div>
  );
}

function ConnectionMap({ live, busy }: { live: LiveWorker | null; busy: boolean }) {
  let route = "Waiting for your worker";
  if (busy) route = "Connecting securely";
  if (live) {
    route = "End-to-end encrypted";
    if (live.worker.mode === "direct") route = "Direct · encrypted";
  }
  return (
    <div className="connection-map" aria-label={route}>
      <div className="map-node">
        <div className="node-icon">
          <Glyph name="user" size={22} />
        </div>
        <div>
          <strong>This browser</strong>
          <span>Keys stay on this device</span>
        </div>
      </div>
      <div className="map-wire" data-connected={!!live}>
        <span>
          <Glyph name="lock" size={12} />
          {route}
        </span>
      </div>
      <div className="map-node">
        <div className="node-icon worker">
          <Glyph name="server" size={22} />
        </div>
        <div>
          <strong>{live?.worker.name || "Your worker"}</strong>
          <span>{live ? "Identity verified" : "On your own server"}</span>
        </div>
      </div>
    </div>
  );
}

function WorkerSettings({
  worker,
  onSave,
  onForget,
  expanded = false,
}: {
  worker: SavedWorker;
  onSave: (worker: SavedWorker) => Promise<void>;
  onForget: () => Promise<void>;
  expanded?: boolean;
}) {
  const [name, setName] = useState(worker.name);
  const [mode, setMode] = useState(worker.mode);
  const [directUrl, setDirectUrl] = useState(worker.directUrl);
  const [relayUrl, setRelayUrl] = useState(worker.relayUrl);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave({ ...worker, name: name.trim(), mode, directUrl: directUrl.trim(), relayUrl: relayUrl.trim() });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="connection-settings" open={expanded}>
      <summary>Connection settings</summary>
      <Paper className="panel" withBorder mt="md">
        <form onSubmit={save}>
          <Stack gap="md">
            <TextInput
              label="Worker name"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              required
              maxLength={80}
            />
            <NativeSelect
              label="Connection route"
              value={mode}
              onChange={(event) => setMode(event.currentTarget.value as "relay" | "direct")}
              data={[
                { value: "relay", label: "Encrypted relay" },
                { value: "direct", label: "Direct · Tailscale or private HTTPS" },
              ]}
            />
            {mode === "direct" && (
              <TextInput
                label="Direct worker address"
                placeholder="https://homarr.my-tailnet.ts.net"
                value={directUrl}
                onChange={(event) => setDirectUrl(event.currentTarget.value)}
                required
              />
            )}
            {mode === "relay" && (
              <TextInput
                label="Relay address"
                placeholder="wss://relay.homarr.dev"
                value={relayUrl}
                onChange={(event) => setRelayUrl(event.currentTarget.value)}
                required
              />
            )}
            <Text size="xs" c="dimmed">
              Direct mode connects your browser to your private worker address. It never falls back to a relay.
            </Text>
            {error && <Alert color="red">{error}</Alert>}
            <Group>
              <Button type="submit" variant="light" loading={busy}>
                Save settings
              </Button>
            </Group>
          </Stack>
        </form>
        <div className="danger-zone">
          <Group justify="space-between">
            <div>
              <Text size="sm" fw={600}>
                Remove local access
              </Text>
              <Text size="xs" c="dimmed">
                To revoke this device everywhere, revoke its grant on the worker.
              </Text>
            </div>
            <Button
              variant="subtle"
              color="red"
              size="sm"
              onClick={onForget}
              leftSection={<Glyph name="trash" size={15} />}
            >
              Forget this device
            </Button>
          </Group>
        </div>
      </Paper>
    </details>
  );
}
