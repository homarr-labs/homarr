import type { ClientRequest } from "node:http";
import type { AgentOptions, RequestOptions } from "node:https";
import { isIP, Socket } from "node:net";
import type { LookupFunction } from "node:net";
import type { Duplex } from "node:stream";
import { checkServerIdentity, connect as connectTls } from "node:tls";
import type { ConnectionOptions, SecureContext } from "node:tls";
import { buildConnector, Client } from "undici/index.js";

import type { CertificateTrustMaterial } from "../certificates/runtime";
import { createCustomCheckServerIdentity } from "./tls";

type NativeHttpsTlsOptions = ConnectionOptions & {
  ca: NonNullable<AgentOptions["ca"]>;
  secureContext: SecureContext;
  checkServerIdentity: typeof checkServerIdentity;
  rejectUnauthorized: true;
};

export interface NativeHttpsTlsRoles {
  readonly target: NativeHttpsTlsOptions;
  readonly proxy: NativeHttpsTlsOptions;
}

export const createNativeHttpsTlsRoles = (
  material: CertificateTrustMaterial,
  getTlsContext: (ca: NonNullable<AgentOptions["ca"]>) => SecureContext,
  override?: Pick<AgentOptions, "ca" | "checkServerIdentity">,
  lookup?: LookupFunction,
): NativeHttpsTlsRoles => {
  const ca = override?.ca ?? material.ca;
  return {
    target: {
      ca,
      secureContext: getTlsContext(ca),
      checkServerIdentity: override?.checkServerIdentity ?? createCustomCheckServerIdentity(material.trustedHostnames),
      rejectUnauthorized: true,
      lookup,
    },
    proxy: {
      ca: material.ca,
      secureContext: getTlsContext(material.ca),
      checkServerIdentity,
      rejectUnauthorized: true,
      lookup,
    },
  };
};

export interface OwnedHttpsProxyConnectionResources {
  readonly request: ClientRequest;
  readonly options: RequestOptions;
  readonly proxy: URL;
  readonly tls: NativeHttpsTlsRoles;
  readonly assertCurrent: () => void;
  readonly onQuarantine: () => void;
  readonly callback: (error: Error | null, stream?: Duplex) => void;
}

export const createOwnedHttpsProxyConnection = (resources: OwnedHttpsProxyConnectionResources) => {
  const controller = new AbortController();
  const completion = Promise.withResolvers<void>();
  const streams = new Map<Duplex, { closed: Promise<void>; onClose: () => void }>();
  const failures: unknown[] = [];
  let client: Client | undefined;
  let destruction: Promise<void> | undefined;
  let started = false;
  let terminal = false;
  let closing = false;
  let delivered: Socket | undefined;
  let connectCompletion: Promise<void> | undefined;
  let pendingFailureDelivery: (() => void) | undefined;
  const originalDestroy = resources.request.destroy;

  const destroyStream = (stream: Duplex) => {
    try {
      stream.destroy();
    } catch (error) {
      failures.push(error);
      resources.onQuarantine();
    }
  };

  const destroyClient = () => {
    if (destruction) return destruction;
    try {
      destruction = (client?.destroy() ?? Promise.resolve()).catch((failure: unknown) => {
        failures.push(failure);
        resources.onQuarantine();
        throw failure;
      });
    } catch (error) {
      failures.push(error);
      resources.onQuarantine();
      destruction = Promise.reject(error);
    }
    void destruction.catch(() => undefined);
    return destruction;
  };

  const joinAsync = async () => {
    const outcomes = await Promise.allSettled([destroyClient(), connectCompletion]);
    for (const outcome of outcomes) if (outcome.status === "rejected") failures.push(outcome.reason);
    let observed = -1;
    while (observed !== streams.size) {
      observed = streams.size;
      await Promise.all([...streams.values()].map((stream) => stream.closed));
    }
    if (failures.length) resources.onQuarantine();
    pendingFailureDelivery?.();
    pendingFailureDelivery = undefined;
    if (failures.length) completion.reject(new AggregateError(failures, "Native proxy retirement failed"));
    else completion.resolve();
  };

  const close = () => {
    if (closing) return;
    closing = true;
    controller.abort(new Error("Native proxy connection retired"));
    for (const stream of streams.keys()) destroyStream(stream);
    void joinAsync();
  };

  const onError = (error: Error) => {
    if (!terminal) finish(error);
  };
  const track = (stream: Duplex) => {
    let owned = streams.get(stream);
    if (!owned) {
      const closed = Promise.withResolvers<void>();
      owned = {
        closed: closed.promise,
        onClose: () => {
          closed.resolve();
          if (delivered === stream) close();
        },
      };
      streams.set(stream, owned);
    }
    stream.removeListener("close", owned.onClose);
    stream.once("close", owned.onClose);
    stream.removeListener("error", onError);
    stream.on("error", onError);
    if (stream.closed) owned.onClose();
    if (controller.signal.aborted || closing) destroyStream(stream);
  };

  const finish = (error: Error | null, stream?: Socket) => {
    if (stream) track(stream);
    if (terminal) {
      if (stream && stream !== delivered) destroyStream(stream);
      return;
    }
    terminal = true;
    resources.request.removeListener("close", cancel);
    if (resources.request.destroy === destroyRequest) resources.request.destroy = originalDestroy;
    if (!error && stream) delivered = stream;
    const notify = (failure: Error | null) => {
      try {
        resources.callback(failure, stream);
      } catch (callbackError) {
        failures.push(callbackError);
        resources.onQuarantine();
        close();
      }
    };
    if (error) {
      pendingFailureDelivery = () => {
        if (failures.length)
          notify(new AggregateError([error, ...failures], "Native proxy delivery and retirement failed"));
        else notify(error);
      };
      close();
    } else notify(null);
  };

  const cancel = () => {
    controller.abort(new Error("Native proxy request cancelled"));
    finish(new Error("Native proxy request cancelled"));
    close();
  };

  const destroyRequest = function (this: ClientRequest, error?: Error) {
    cancel();
    return originalDestroy.call(this, error);
  };

  const assertCurrent = () => {
    controller.signal.throwIfAborted();
    if (resources.request.destroyed) throw new Error("Native proxy request is destroyed");
    resources.assertCurrent();
  };

  const start = () => {
    if (started) throw new Error("Native proxy connection already started");
    started = true;
    resources.request.destroy = destroyRequest;
    resources.request.once("close", cancel);
    try {
      assertCurrent();
      const proxy = new URL(resources.proxy.href);
      if (proxy.protocol !== "http:" && proxy.protocol !== "https:")
        throw new Error("Unsupported native proxy protocol");
      const host = resources.options.hostname ?? resources.options.host;
      if (typeof host !== "string" || !host || /[\s/@]/.test(host)) throw new Error("Invalid native proxy target host");
      const hostname = host.replace(/^\[|\]$/g, "");
      const port = resources.options.port ?? 443;
      if (!/^\d+$/.test(String(port)) || Number(port) < 1 || Number(port) > 65535)
        throw new Error("Invalid native proxy target port");
      let authority = `${hostname}:${port}`;
      if (isIP(hostname) === 6) authority = `[${hostname}]:${port}`;
      let headers: Record<string, string> | undefined;
      if (proxy.username || proxy.password) {
        const credentials = `${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`;
        headers = { "proxy-authorization": `Basic ${Buffer.from(credentials).toString("base64")}` };
      }
      const connector = buildConnector({ ...resources.tls.proxy, maxCachedSessions: 0 });
      assertCurrent();
      client = new Client(proxy.origin, {
        connect: (connection, notify) => {
          let registering = true;
          let registered = false;
          let notified = false;
          let outcome: Parameters<typeof notify> | undefined;
          const deliver: typeof notify = (...args) => {
            if (notified) {
              if (args[1]) destroyStream(args[1]);
              return;
            }
            notified = true;
            try {
              notify(...args);
            } catch (error) {
              failures.push(error);
              cancel();
            }
          };
          const notifyOwned: typeof notify = (...args) => {
            if (args[1]) track(args[1]);
            if (registering) outcome = args;
            else deliver(...args);
          };
          try {
            assertCurrent();
            const initial: unknown = connector(connection, notifyOwned);
            if (!(initial instanceof Socket)) {
              const error = new Error("Pinned native proxy initial socket is unavailable; ownership remains held");
              failures.push(error);
              throw error;
            }
            track(initial);
            registered = true;
            registering = false;
            assertCurrent();
            if (outcome) deliver(...outcome);
          } catch (error) {
            if (!registered) failures.push(error);
            registering = false;
            deliver(error instanceof Error ? error : new Error("Native proxy connector failed"), null);
          }
        },
      });
      assertCurrent();
      const connected = Promise.withResolvers<void>();
      connectCompletion = connected.promise;
      client.connect({ path: authority, headers, signal: controller.signal }, (error, data) => {
        try {
          if (data?.socket) track(data.socket);
          if (error) throw error;
          assertCurrent();
          if (!data || !(data.socket instanceof Socket) || data.statusCode < 200 || data.statusCode >= 300)
            throw new Error("Native proxy CONNECT rejected");
          let servername: string | undefined;
          if (!isIP(hostname)) servername = resources.options.servername || hostname;
          const targetOptions: ConnectionOptions = {
            ...resources.options,
            ...resources.tls.target,
            host: hostname,
            port: Number(port),
            path: undefined,
            servername,
            socket: data.socket,
            ALPNProtocols: ["http/1.1"],
          };
          const target = connectTls(targetOptions);
          track(target);
          target.once("error", (failure: Error) => finish(failure, target));
          target.once("end", () => {
            if (!terminal) finish(new Error("Native proxy target ended before delivery"), target);
          });
          target.once("close", () => {
            if (!terminal) finish(new Error("Native proxy target closed before delivery"), target);
          });
          target.once("secureConnect", () => {
            try {
              assertCurrent();
              finish(null, target);
            } catch (failure) {
              finish(failure instanceof Error ? failure : new Error("Native proxy target delivery failed"), target);
            }
          });
          void destroyClient().catch((failure: unknown) => {
            failures.push(failure);
            cancel();
          });
        } catch (failure) {
          finish(failure instanceof Error ? failure : new Error("Native proxy CONNECT failed"));
        } finally {
          connected.resolve();
        }
      });
    } catch (failure) {
      finish(failure instanceof Error ? failure : new Error("Native proxy connection failed"));
    }
  };

  void completion.promise.catch(() => undefined);
  return { start, cancel, closedAsync: completion.promise };
};
