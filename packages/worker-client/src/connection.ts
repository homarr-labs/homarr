import {
  createBrowserConnection,
  createRelayTransport,
  fromBase64Url,
  generateDeviceIdentity,
  getWorkerId,
  publicIdentityJwk,
  toBase64Url,
  utf8,
} from "@homarr/remote-protocol";
import type { WorkerIdentity } from "@homarr/remote-protocol";
import { prepareBootstrapDevice, sameWorkerPin } from "./vault";
import { createWorkerRequestScheduler } from "./scheduler";

export type WorkerCredential =
  | { kind: "claim"; secret: string }
  | { kind: "grant" | "invite" | "share"; token: string };
export interface WorkerGrant {
  id: string;
  token: string;
  role: "owner" | "viewer" | "user" | "service";
  userId?: string;
  boardIds: string[];
  expiresAt: number | null;
}
export interface SavedWorker {
  workerId: string;
  name: string;
  pinnedIdentity: JsonWebKey;
  deviceIdentity: WorkerIdentity;
  credential: WorkerCredential;
  mode: "relay" | "direct";
  relayUrl: string;
  directUrl: string;
  relayCapability: string;
  grant: WorkerGrant;
}
export type ConnectionInput = Omit<SavedWorker, "grant" | "deviceIdentity"> & { deviceIdentity?: WorkerIdentity };
export type WorkerConnection = Awaited<ReturnType<typeof createBrowserConnection>> & {
  /** Browser-only scheduling hint; it confers no worker authorization. */
  fetchSubscription?: Awaited<ReturnType<typeof createBrowserConnection>>["fetch"];
};

export function matchingSavedWorker(workers: SavedWorker[], input: ConnectionInput): SavedWorker | undefined {
  return workers.find(
    (worker) =>
      worker.workerId === input.workerId &&
      sameWorkerPin(worker.pinnedIdentity, input.pinnedIdentity) &&
      worker.credential.kind === "grant" &&
      (!worker.grant.expiresAt || worker.grant.expiresAt > Date.now()),
  );
}

export const secureConnectionMessage =
  "Open Homarr using HTTPS. A private worker connection requires a secure browser address; localhost also works on the same computer.";

export function browserCryptoAvailable(): boolean {
  return typeof window !== "undefined" && window.isSecureContext && !!window.crypto?.subtle;
}

function websocketUrl(value: string, path: string): URL {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash)
    throw new Error("Connection addresses cannot contain credentials, queries, or fragments.");
  if (url.protocol === "https:") url.protocol = "wss:";
  if (url.protocol === "http:") url.protocol = "ws:";
  if (url.protocol !== "ws:" && url.protocol !== "wss:") throw new Error("Use an HTTPS or WSS connection address.");
  const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (url.protocol !== "wss:" && !loopback)
    throw new Error("Remote connections require HTTPS/WSS. Use Tailscale Serve or a TLS reverse proxy.");
  url.pathname = `${url.pathname.replace(/\/$/, "")}${path}`;
  return url;
}

export function validateConnectionAddress(mode: "relay" | "direct", address: string): void {
  websocketUrl(address, "");
  if (!address.trim()) throw new Error(`Enter a ${mode} connection address.`);
}

export function parseConnectionLink(value: string, baseUrl?: string): ConnectionInput {
  let url: URL;
  try {
    url = new URL(value, baseUrl ?? window.location.origin);
  } catch {
    throw new Error("Paste the full pairing or sharing link from your worker.");
  }
  const fragment = new URLSearchParams(url.hash.slice(1));
  const workerId = fragment.get("worker");
  const key = fragment.get("key");
  if (!workerId || !key)
    throw new Error("This is not a complete connection link. Copy the full setup or invitation link.");
  let pinnedIdentity: JsonWebKey;
  try {
    pinnedIdentity = publicIdentityJwk(JSON.parse(new TextDecoder().decode(fromBase64Url(key, 4096))));
  } catch (cause) {
    throw new Error("This connection link is damaged. Ask the owner for a new link.", { cause });
  }
  let credential: WorkerCredential;
  const claim = fragment.get("claim");
  const invite = fragment.get("invite");
  const share = fragment.get("share");
  if ([claim, invite, share].filter(Boolean).length !== 1)
    throw new Error("The link must contain exactly one pairing, invitation, or sharing secret.");
  if (claim) credential = { kind: "claim", secret: claim };
  else if (invite) credential = { kind: "invite", token: invite };
  else if (share) credential = { kind: "share", token: share };
  else throw new Error("The link is missing its private access secret.");
  const relayUrl = fragment.get("relay") ?? "";
  const directUrl = fragment.get("direct") ?? "";
  if (!relayUrl && !directUrl) throw new Error("The link is missing its relay or direct connection address.");
  let mode: "relay" | "direct" = "relay";
  if (directUrl) mode = "direct";
  return {
    workerId,
    name: fragment.get("name") || "My Homarr",
    pinnedIdentity,
    credential,
    mode,
    relayUrl,
    directUrl,
    relayCapability: fragment.get("cap") ?? "",
  };
}

export function shareLink(
  worker: SavedWorker,
  token: string,
  kind: "share" | "invite",
  name: string,
  frontendUrl = "/",
): string {
  const url = new URL(frontendUrl, window.location.origin);
  const fragment = new URLSearchParams({
    worker: worker.workerId,
    key: toBase64Url(utf8(JSON.stringify(publicIdentityJwk(worker.pinnedIdentity)))),
    [kind]: token,
    name,
  });
  if (worker.mode === "relay") {
    fragment.set("relay", worker.relayUrl);
    fragment.set("cap", worker.relayCapability);
  } else {
    fragment.set("direct", worker.directUrl);
    fragment.set("cap", worker.relayCapability);
  }
  url.hash = fragment.toString();
  return url.href;
}

export async function openWorker(
  input: ConnectionInput,
  onClose?: () => void,
): Promise<{ connection: WorkerConnection; worker: SavedWorker }> {
  if (!browserCryptoAvailable()) throw new Error(secureConnectionMessage);
  if ((await getWorkerId(input.pinnedIdentity)) !== input.workerId)
    throw new Error("This link does not match the server identity. Ask its owner for a fresh link.");
  let deviceIdentity = input.deviceIdentity;
  if (input.credential.kind === "claim" || input.credential.kind === "invite")
    deviceIdentity = await prepareBootstrapDevice(input.workerId, input.pinnedIdentity, deviceIdentity);
  deviceIdentity ??= await generateDeviceIdentity(false);
  if (!input.relayCapability) throw new Error("This link is missing its connection capability.");
  let url: URL;
  if (input.mode === "relay") {
    url = websocketUrl(input.relayUrl, `/connect/${encodeURIComponent(input.workerId)}`);
  } else url = websocketUrl(input.directUrl, "/remote/connect");
  const socket = new WebSocket(url);
  let closeHandler = onClose;
  let authenticated = false;
  let scheduler: ReturnType<typeof createWorkerRequestScheduler> | undefined;
  socket.addEventListener("close", () => {
    scheduler?.close();
    if (authenticated) closeHandler?.();
  });
  const ready = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => failed(), 12_000);
    function cleanup() {
      clearTimeout(timeout);
      socket.removeEventListener("error", failed);
      socket.removeEventListener("close", failed);
      socket.removeEventListener("message", admission);
    }
    function failed() {
      cleanup();
      socket.close();
      reject(new Error("Unable to reach this worker. Check that it is online and this frontend origin is allowed."));
    }
    function admission(event: MessageEvent<unknown>) {
      if (typeof event.data !== "string" || event.data.length > 16_384) {
        failed();
        return;
      }
      let message: unknown;
      try {
        message = JSON.parse(event.data);
      } catch {
        failed();
        return;
      }
      if (!message || typeof message !== "object" || !("type" in message) || message.type !== "connected") {
        failed();
        return;
      }
      cleanup();
      resolve();
    }
    socket.addEventListener("error", failed, { once: true });
    socket.addEventListener("close", failed, { once: true });
    socket.addEventListener("message", admission);
    socket.addEventListener(
      "open",
      () => socket.send(JSON.stringify({ type: "connect", capability: input.relayCapability })),
      { once: true },
    );
  });
  try {
    await ready;
    const connection = await createBrowserConnection({
      workerId: input.workerId,
      pinnedIdentity: input.pinnedIdentity,
      credential: input.credential,
      deviceIdentity,
      transport: createRelayTransport(socket),
    });
    const authorization = connection.authorization as { grant?: WorkerGrant };
    if (!authorization.grant?.token || !authorization.grant.id) {
      connection.close();
      throw new Error("The worker returned invalid device authorization.");
    }
    let credential: WorkerCredential = { kind: "grant", token: authorization.grant.token };
    if (input.credential.kind === "share") credential = input.credential;
    scheduler = createWorkerRequestScheduler(connection.fetch.bind(connection));
    const scheduled = scheduler;
    authenticated = true;
    return {
      connection: {
        ...connection,
        fetch: scheduled.fetch,
        fetchSubscription: scheduled.fetchSubscription,
        close() {
          scheduled.close();
          connection.close();
        },
      },
      worker: { ...input, deviceIdentity, credential, grant: authorization.grant },
    };
  } catch (error) {
    closeHandler = undefined;
    socket.close();
    if (error instanceof Error && error.message === "Remote transport closed")
      throw new Error(
        "The worker closed this connection. Check that the link is valid and this device has the required access.",
        { cause: error },
      );
    throw error;
  }
}

export async function workerRequest<T>(connection: WorkerConnection, path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set("Content-Type", "application/json");
  const response = await connection.fetch(path, { ...init, headers });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    let message = `The worker returned ${response.status}.`;
    if (body && typeof body === "object" && "error" in body && typeof body.error === "string") message = body.error;
    throw new Error(message);
  }
  return body as T;
}
