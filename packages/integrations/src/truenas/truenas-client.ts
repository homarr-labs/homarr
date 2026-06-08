import type { RawData } from "ws";
import { WebSocket } from "ws";
import z from "zod";

import { createId } from "@homarr/common";
import { matchErrorCode, RequestError, ResponseError } from "@homarr/common/server";
import {
  getAllTrustedCertificatesAsync,
  getTrustedCertificateHostnamesAsync,
} from "@homarr/core/infrastructure/certificates";
import { createCustomCheckServerIdentity } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";

import type { IntegrationTestingInput } from "../base/integration";
import type { TrueNasApi } from "./truenas-api";
import { trueNasApis } from "./truenas-api";

const logger = createLogger({ module: "trueNasClient" });

const REQUEST_TIMEOUT_MS = 5000;

type CertificateOptions = IntegrationTestingInput["options"];

export type TrueNasCredentials = { apiKey: string } | { username: string; password: string };

/**
 * Handles talking to a TrueNAS server: opening a websocket with Homarr's
 * trusted certificates, negotiating the API variant, authenticating, and
 * sending method requests. Connections are reused across the per-request
 * integration instances and reconnected transparently when the server drops
 * an idle socket.
 */
export class TrueNasClient {
  // Keyed by integration id. The value is the in-flight connection promise so concurrent
  // callers reuse a single socket instead of racing to open duplicates.
  private static readonly connectionMap = new Map<string, Promise<TrueNasSocket>>();
  private static readonly apiMap = new Map<string, TrueNasApi>();

  constructor(
    private readonly id: string,
    private readonly webSocketUrl: (path: `/${string}`) => URL,
    private readonly credentials: TrueNasCredentials,
  ) {}

  /** Sends an authenticated request, reusing the cached connection while it is open. */
  public async requestAsync(method: string, params: unknown[] = []): Promise<unknown> {
    const socket = await this.getSocketAsync();
    return socket.requestAsync(method, params);
  }

  /**
   * Opens a connection with the provided certificate options, authenticates,
   * and closes it. Used by the connection test, which may run with updated
   * credentials, so any cached connection is dropped and the API re-detected.
   */
  public async testAsync(certificate: CertificateOptions): Promise<void> {
    this.evictConnection();
    TrueNasClient.apiMap.delete(this.id);

    const socket = await this.openSocketAsync(certificate);
    try {
      await this.authenticateAsync(socket);
    } finally {
      socket.close();
    }
  }

  private getSocketAsync(): Promise<TrueNasSocket> {
    let connection = TrueNasClient.connectionMap.get(this.id);
    if (!connection) {
      connection = this.connectAndAuthenticateAsync();
      TrueNasClient.connectionMap.set(this.id, connection);

      const evict = () => {
        if (TrueNasClient.connectionMap.get(this.id) === connection) {
          TrueNasClient.connectionMap.delete(this.id);
        }
      };
      // Reconnect on the next request once this attempt fails or the server drops the socket.
      connection.then((socket) => socket.onClose(evict), evict);
    }

    return connection;
  }

  private async connectAndAuthenticateAsync(): Promise<TrueNasSocket> {
    const socket = await this.openSocketAsync(await resolveCertificateOptionsAsync());
    try {
      await this.authenticateAsync(socket);
    } catch (error) {
      // Never keep an unauthenticated socket, it would be reused without re-authenticating.
      socket.close();
      throw error;
    }
    return socket;
  }

  private evictConnection() {
    const connection = TrueNasClient.connectionMap.get(this.id);
    if (!connection) return;

    TrueNasClient.connectionMap.delete(this.id);
    connection.then((socket) => socket.close()).catch(() => undefined);
  }

  /**
   * Connects using the JSON-RPC API (TrueNAS 24.10+) when available and falls
   * back to the legacy websocket API otherwise. A missing JSON-RPC endpoint
   * surfaces as a plain protocol error; certificate, connection, DNS and
   * timeout errors are endpoint-independent and are never retried.
   */
  private async openSocketAsync(certificate: CertificateOptions): Promise<TrueNasSocket> {
    const cachedApi = TrueNasClient.apiMap.get(this.id);
    if (cachedApi) {
      return openTrueNasSocketAsync(this.webSocketUrl(cachedApi.path), cachedApi, certificate);
    }

    try {
      const socket = await openTrueNasSocketAsync(
        this.webSocketUrl(trueNasApis.jsonRpc.path),
        trueNasApis.jsonRpc,
        certificate,
      );
      TrueNasClient.apiMap.set(this.id, trueNasApis.jsonRpc);
      return socket;
    } catch (error) {
      if (error instanceof RequestError) throw error;

      logger.debug("JSON-RPC API unavailable, falling back to the legacy websocket API", {
        error: error instanceof Error ? error.message : undefined,
      });
      const socket = await openTrueNasSocketAsync(
        this.webSocketUrl(trueNasApis.legacy.path),
        trueNasApis.legacy,
        certificate,
      );
      TrueNasClient.apiMap.set(this.id, trueNasApis.legacy);
      return socket;
    }
  }

  /**
   * Authenticates with an API key when one is configured, otherwise with the
   * username and password. Both methods work on either API.
   * @see https://www.truenas.com/docs/api/scale_websocket_api.html#websocket_protocol
   */
  private async authenticateAsync(socket: TrueNasSocket): Promise<void> {
    const response =
      "apiKey" in this.credentials
        ? await socket.requestAsync("auth.login_with_api_key", [this.credentials.apiKey])
        : await socket.requestAsync("auth.login", [this.credentials.username, this.credentials.password]);

    const success = await z.boolean().parseAsync(response);
    if (!success) throw new ResponseError({ status: 401 });
  }
}

/**
 * Wraps a single websocket connection and speaks whichever TrueNAS API
 * ({@link trueNasApis}) was negotiated when it was opened.
 */
class TrueNasSocket {
  constructor(
    private readonly webSocket: WebSocket,
    private readonly api: TrueNasApi,
  ) {}

  public close() {
    this.webSocket.close();
  }

  public onClose(listener: () => void) {
    this.webSocket.once("close", listener);
  }

  /**
   * The legacy DDP API requires a "connect" handshake to obtain a session
   * before any method can be called.
   * @see https://www.truenas.com/docs/api/scale_websocket_api.html#websocket_protocol
   */
  public registerSessionAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      const handler = (raw: RawData) => {
        const message = parseMessage(raw);
        if (message?.msg === "connected") {
          this.webSocket.off("message", handler);
          resolve();
        } else if (message?.msg === "failed") {
          this.webSocket.off("message", handler);
          reject(new Error("Unable to establish TrueNAS session"));
        }
      };

      this.webSocket.on("message", handler);
      this.webSocket.send(JSON.stringify({ msg: "connect", version: "1", support: ["1"] }));
    });
  }

  /**
   * Sends a method request and resolves with its result. Rejects after
   * {@link REQUEST_TIMEOUT_MS} when no matching response was received.
   */
  public requestAsync(method: string, params: unknown[] = []): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = createId();

      const cleanup = () => {
        clearTimeout(timeoutId);
        this.webSocket.off("message", handler);
        this.webSocket.off("close", onClose);
        this.webSocket.off("error", onError);
      };

      const handler = (raw: RawData) => {
        const message = parseMessage(raw);
        if (!message) return;

        const response = this.api.matchResponse(message, id);
        if (!response) return;

        cleanup();
        if ("error" in response) {
          reject(new Error(`TrueNAS method "${method}" failed: ${JSON.stringify(response.error)}`));
          return;
        }
        logger.debug("Received method response", { id, method, api: this.api.kind });
        resolve(response.result);
      };

      // A dropped connection would otherwise leave the request hanging until the timeout below.
      const onClose = () => {
        cleanup();
        reject(
          new RequestError(
            { type: "connection", reason: "reset", code: "ECONNRESET" },
            { cause: new Error("Connection closed before a response was received") },
          ),
        );
      };
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(
          new RequestError(
            {
              type: "timeout",
              reason: "aborted",
              code: "ECONNABORTED",
            },
            { cause: new Error("Canceled request after 5 seconds") },
          ),
        );
      }, REQUEST_TIMEOUT_MS);

      this.webSocket.on("message", handler);
      this.webSocket.once("close", onClose);
      this.webSocket.once("error", onError);
      logger.debug("Sending method request", { id, method, api: this.api.kind });
      this.webSocket.send(JSON.stringify(this.api.buildRequest(id, method, params)));
    });
  }
}

/**
 * Opens a websocket using Homarr's trusted certificates and performs the
 * session handshake when the API requires it. TLS, connection, DNS and timeout
 * failures are translated into {@link RequestError}s so the connection test can
 * offer to trust a self-signed certificate, exactly like the HTTP integrations.
 */
const openTrueNasSocketAsync = async (
  url: URL,
  api: TrueNasApi,
  certificate: CertificateOptions,
): Promise<TrueNasSocket> => {
  logger.debug("Connecting to TrueNAS websocket", { url: url.toString(), api: api.kind });

  const webSocket = await new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket(url, {
      ca: certificate.ca,
      // The @types/ws contract types this as returning a boolean, but ws forwards it to
      // tls.connect which uses Node's `Error | undefined` contract that our helper follows.
      checkServerIdentity: certificate.checkServerIdentity as never,
    });

    socket.once("open", () => resolve(socket));
    socket.once("error", (error: Error & { code?: string }) => {
      const matched = error.code ? matchErrorCode(error.code) : undefined;
      reject(matched ? new RequestError(matched, { cause: error }) : error);
    });
  });

  const socket = new TrueNasSocket(webSocket, api);
  if (api.requiresSessionHandshake) await socket.registerSessionAsync();
  return socket;
};

const resolveCertificateOptionsAsync = async (): Promise<CertificateOptions> => ({
  ca: await getAllTrustedCertificatesAsync(),
  checkServerIdentity: createCustomCheckServerIdentity(await getTrustedCertificateHostnamesAsync()),
});

const parseMessage = (raw: RawData): Record<string, unknown> | undefined => {
  try {
    const parsed: unknown = JSON.parse(raw.toString());
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
};
