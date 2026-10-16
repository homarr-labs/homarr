import type { RemoteTransport, WorkerConnection, WorkerRequestContext } from "@homarr/remote-protocol";
import { createWorkerConnection, signIdentity, toBase64Url, utf8 } from "@homarr/remote-protocol";
import type { AccessCredential, AccessPrincipal, AuthenticatedEnvelope } from "@homarr/worker-access";

import { writePairingFile } from "./state";
import type { WorkerState } from "./state";

const maximumBufferedBytes = 4 * 1024 * 1024;
export function createTransport(send: (frame: string) => void, close: () => void) {
  const listeners = new Set<(frame: string) => void>();
  const closed = new Set<() => void>();
  const transport: RemoteTransport = {
    send,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    onClose(listener) {
      closed.add(listener);
      return () => closed.delete(listener);
    },
    close,
  };
  return {
    transport,
    message(frame: string) {
      for (const listener of listeners) listener(frame);
    },
    ended() {
      for (const listener of closed) listener();
      listeners.clear();
      closed.clear();
    },
  };
}
export type IngressTransport = ReturnType<typeof createTransport>;

export class WorkerChannels {
  private readonly connections = new Map<WorkerConnection, AuthenticatedEnvelope>();
  private readonly nativeUsers = new WeakMap<
    AccessPrincipal,
    { revision: string; checkedAt: number; pending?: Promise<void> }
  >();
  constructor(
    readonly state: WorkerState,
    readonly onRequest: (request: Request, context: WorkerRequestContext) => Promise<Response>,
  ) {}

  private async assertAuthorization(authorization: AuthenticatedEnvelope) {
    const principal = authorization.principal;
    this.state.access.assertActive(principal);
    if (principal.role !== "user") return;
    const { nativeUserAuthorizationRevision } = await import("./native-user");
    const current = this.nativeUsers.get(principal);
    if (!current) {
      const revision = await nativeUserAuthorizationRevision(this.state, principal);
      this.nativeUsers.set(principal, { revision, checkedAt: Date.now() });
      return;
    }
    if (current.pending) return current.pending;
    if (Date.now() - current.checkedAt < 1000) return;
    current.pending = (async () => {
      const revision = await nativeUserAuthorizationRevision(this.state, principal);
      if (revision !== current.revision) throw new Error("Native Homarr permissions changed; reconnect required");
      current.checkedAt = Date.now();
    })().finally(() => {
      delete current.pending;
    });
    return current.pending;
  }

  async accept(transport: RemoteTransport) {
    const connection = await createWorkerConnection({
      transport,
      identity: this.state.identity,
      authorize: async (credential, device) => {
        let authorization: AuthenticatedEnvelope;
        const input = credential as AccessCredential;
        if (input.kind === "local-login" || input.kind === "local-register") {
          const { authenticateLocalAccount } = await import("./local-accounts");
          const { userId, passwordHash } = await authenticateLocalAccount(this.state, input);
          authorization = await this.state.access.authenticateNativeAccount(device, userId);
          const { recordLocalSession } = await import("./local-accounts");
          await recordLocalSession(authorization, passwordHash);
        } else authorization = await this.state.access.authenticateEnvelope(device, input);
        await this.assertAuthorization(authorization);
        if ((credential as AccessCredential).kind === "claim") await writePairingFile(this.state);
        return authorization;
      },
      publicAuthorization: (authorization) => ({ grant: (authorization as AuthenticatedEnvelope).grant }),
      onRequest: async (request, context) => {
        const authorization = context.authorization as AuthenticatedEnvelope;
        await this.assertAuthorization(authorization);
        const response = await this.onRequest(request, context);
        if (!response.body) return response;
        const reader = response.body.getReader();
        const body = new ReadableStream<Uint8Array>({
          pull: async (controller) => {
            try {
              await this.assertAuthorization(authorization);
              const chunk = await reader.read();
              await this.assertAuthorization(authorization);
              if (chunk.done) controller.close();
              else controller.enqueue(chunk.value);
            } catch {
              await reader.cancel().catch(() => undefined);
              controller.error(new Error("Worker authorization expired or was revoked"));
            }
          },
          cancel: (reason) => reader.cancel(reason),
        });
        return new Response(body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      },
    });
    const authorization = connection.authorization as AuthenticatedEnvelope;
    this.connections.set(connection, authorization);
    const expiresAt = authorization.grant.expiresAt;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    if (expiresAt !== null) {
      const scheduleExpiry = () => {
        const remaining = expiresAt - Date.now();
        if (remaining <= 0) {
          connection.close();
          this.connections.delete(connection);
          return;
        }
        expiryTimer = setTimeout(scheduleExpiry, Math.min(remaining, 2_147_483_647));
        expiryTimer.unref();
      };
      scheduleExpiry();
    }
    const cleanup = transport.onClose?.(() => this.connections.delete(connection));
    // Expiry and revocation must end streams, not just prevent the next request.
    const interval = setInterval(() => {
      if (!this.connections.has(connection)) {
        clearInterval(interval);
        clearTimeout(expiryTimer);
        cleanup?.();
        return;
      }
      void this.assertAuthorization(authorization).catch(() => {
        connection.close();
        this.connections.delete(connection);
        clearInterval(interval);
        clearTimeout(expiryTimer);
        cleanup?.();
      });
    }, 1000);
    interval.unref();
    return connection;
  }

  revalidate() {
    for (const [connection, auth] of this.connections) {
      try {
        this.state.access.assertActive(auth.principal);
      } catch {
        connection.close();
        this.connections.delete(connection);
      }
    }
  }

  close() {
    for (const connection of this.connections.keys()) connection.close();
    this.connections.clear();
  }
}

/** Outbound-only worker connection. The relay never receives an access credential or plaintext request. */
export function connectRelay(state: WorkerState, channels: WorkerChannels) {
  let stopped = false;
  let socket: WebSocket | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  const peers = new Map<string, IngressTransport>();
  const cleanup = () => {
    for (const peer of peers.values()) peer.ended();
    peers.clear();
  };
  const send = (frame: unknown) => {
    const body = JSON.stringify(frame);
    if (
      !socket ||
      socket.readyState !== WebSocket.OPEN ||
      socket.bufferedAmount + utf8(body).byteLength > maximumBufferedBytes
    ) {
      socket?.close();
      throw new Error("Relay connection backpressure exceeded");
    }
    socket.send(body);
  };
  const open = () => {
    if (stopped) return;
    // A private container-network address may differ from the public invitation URL.
    const connectUrl = process.env.WORKER_RELAY_CONNECT_URL;
    const address = new URL(connectUrl ?? state.relayUrl);
    if (address.protocol === "https:") address.protocol = "wss:";
    if (address.protocol === "http:") address.protocol = "ws:";
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(address.hostname);
    if (
      (address.protocol !== "wss:" && !((loopback || connectUrl !== undefined) && address.protocol === "ws:")) ||
      address.search ||
      address.hash ||
      address.username ||
      address.password
    ) {
      throw new Error("Relay requires a clean HTTPS/WSS URL (HTTP is allowed only for loopback)");
    }
    address.pathname = `${address.pathname.replace(/\/$/, "")}/workers/${encodeURIComponent(state.workerId)}`;
    const registrationToken = process.env.WORKER_RELAY_REGISTRATION_TOKEN;
    // Bun supports headers in its client constructor; DOM types omit this overload.
    const BunWebSocket = WebSocket as unknown as { new (url: string | URL, options: Bun.WebSocketOptions): WebSocket };
    const currentSocket = new BunWebSocket(address, {
      headers: registrationToken ? { Authorization: `Bearer ${registrationToken}` } : {},
    });
    socket = currentSocket;
    let challengeSeen = false;
    let registered = false;
    currentSocket.addEventListener("message", async (event) => {
      try {
        if (socket !== currentSocket || stopped) return;
        if (typeof event.data !== "string" || event.data.length > 1_048_576) throw new Error("Invalid relay envelope");
        const message = JSON.parse(event.data) as {
          type: string;
          nonce?: string;
          channelId?: string;
          payload?: string;
          workerId?: string;
          generation?: string;
        };
        if (message.type === "challenge") {
          if (challengeSeen || registered) throw new Error("Repeated relay registration challenge");
          challengeSeen = true;
          if (typeof message.nonce !== "string" || message.nonce.length > 256)
            throw new Error("Invalid relay challenge");
          const signature = await signIdentity(
            state.identity,
            JSON.stringify(["homarr-relay-register-v1", state.workerId, message.nonce]),
          );
          const capabilityHash = toBase64Url(
            new Uint8Array(await crypto.subtle.digest("SHA-256", utf8(state.capability))),
          );
          if (socket !== currentSocket || stopped) return;
          send({ type: "register", publicKey: state.identity.publicJwk, signature, capabilityHash });
        } else if (message.type === "registered") {
          if (
            !challengeSeen ||
            registered ||
            message.workerId !== state.workerId ||
            typeof message.generation !== "string"
          )
            throw new Error("Invalid relay registration acknowledgement");
          registered = true;
        } else if (message.type === "channel.open") {
          if (!registered) throw new Error("Relay channel before worker registration");
          const id = message.channelId;
          if (!id || peers.has(id) || peers.size >= 32) throw new Error("Invalid relay channel");
          const peer = createTransport(
            (payload) => send({ type: "channel.message", channelId: id, payload }),
            () => {
              peers.delete(id);
              peer.ended();
              if (socket?.readyState === WebSocket.OPEN) send({ type: "channel.close", channelId: id });
            },
          );
          peers.set(id, peer);
          void channels.accept(peer.transport).catch(() => peer.transport.close?.());
        } else if (message.type === "channel.message") {
          if (!registered) throw new Error("Relay channel before worker registration");
          if (typeof message.payload !== "string") throw new Error("Invalid relay payload");
          peers.get(message.channelId ?? "")?.message(message.payload);
        } else if (message.type === "channel.close") {
          const peer = peers.get(message.channelId ?? "");
          peers.delete(message.channelId ?? "");
          peer?.ended();
        }
      } catch {
        socket?.close();
      }
    });
    currentSocket.addEventListener("close", () => {
      if (socket !== currentSocket) return;
      cleanup();
      if (!stopped) {
        retry = setTimeout(open, 1500);
        retry.unref();
      }
    });
    currentSocket.addEventListener("error", () => currentSocket.close());
  };
  open();
  const heartbeat = setInterval(() => {
    if (socket?.readyState === WebSocket.OPEN) {
      try {
        send({ type: "ping" });
      } catch {
        socket.close();
      }
    }
  }, 20_000);
  heartbeat.unref();
  return () => {
    stopped = true;
    clearTimeout(retry);
    clearInterval(heartbeat);
    cleanup();
    socket?.close();
  };
}
