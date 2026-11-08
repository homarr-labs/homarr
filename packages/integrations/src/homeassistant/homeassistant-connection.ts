import type { RawData } from "ws";
import { WebSocket } from "ws";

import { isRecord } from "@homarr/common";
import { matchErrorCode, RequestError, ResponseError } from "@homarr/common/server";
import {
  getAllTrustedCertificatesAsync,
  getTrustedCertificateHostnamesAsync,
} from "@homarr/core/infrastructure/certificates";
import { createCustomCheckServerIdentity } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";

import type { IntegrationTestingInput } from "../base/integration";
import type { HomeAssistantRegistry, RawEntityState } from "./homeassistant-types";
import {
  areaRegistrySchema,
  compressedStateEventSchema,
  deviceRegistrySchema,
  entityDisplayRegistrySchema,
  floorRegistrySchema,
} from "./homeassistant-types";

const logger = createLogger({ module: "homeAssistantConnection" });

const COMMAND_TIMEOUT_MS = 10_000;
const CONNECT_TIMEOUT_MS = 10_000;
const STATES_INIT_TIMEOUT_MS = 10_000;
const IDLE_TIMEOUT_MS = 5 * 60_000;
const REGISTRY_TTL_MS = 60_000;
const UNSUPPORTED_REGISTRY_CODES = new Set(["unknown_command", "unauthorized"]);

type CertificateOptions = IntegrationTestingInput["options"];

export interface HomeAssistantConnectionOptions {
  key: string;
  url: URL;
  token: string;
}

export interface HomeAssistantStateChange {
  changed: RawEntityState[];
  removed: string[];
}

export interface HomeAssistantStateListener {
  onChange: (change: HomeAssistantStateChange) => void;
  onError: (error: unknown) => void;
}

const connectionClosedError = () =>
  new RequestError(
    { type: "connection", reason: "reset", code: "ECONNRESET" },
    { cause: new Error("Home Assistant connection closed") },
  );

const describeFailure = (error: unknown) => {
  if (error instanceof HomeAssistantCommandError) return `command:${error.code}`;
  if (error instanceof RequestError || error instanceof ResponseError) return "network";
  if (error instanceof Error && error.name === "ZodError") return "parse";
  return "unknown";
};

interface PendingCommand {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timeout: NodeJS.Timeout;
}

export class HomeAssistantCommandError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
    public readonly translationKey?: string,
  ) {
    super(message);
    this.name = "HomeAssistantCommandError";
  }
}

export class HomeAssistantConnection {
  private static readonly pool = new Map<string, HomeAssistantConnection>();

  public static acquire(options: HomeAssistantConnectionOptions) {
    const existing = HomeAssistantConnection.pool.get(options.key);
    if (existing) return existing;

    const connection = new HomeAssistantConnection(options);
    HomeAssistantConnection.pool.set(options.key, connection);
    return connection;
  }

  public static async testAsync(url: URL, token: string, certificate: CertificateOptions) {
    const socket = await openSocketAsync(url, certificate);
    try {
      await authenticateAsync(socket, token);
    } finally {
      socket.close();
    }
  }

  private socket: Promise<WebSocket> | undefined;
  private nextId = 1;
  private readonly pending = new Map<number, PendingCommand>();
  private readonly eventHandlers = new Map<number, (event: unknown) => void>();
  private readonly states = new Map<string, RawEntityState>();
  private statesReady: Promise<void> | undefined;
  private rejectStatesInit: ((error: unknown) => void) | undefined;
  private readonly stateListeners = new Set<HomeAssistantStateListener>();
  private registry: { value: Promise<HomeAssistantRegistry | null>; fetchedAt: number } | undefined;
  private lastRegistry: HomeAssistantRegistry | undefined;
  private idleTimer: NodeJS.Timeout | undefined;

  private constructor(private readonly options: HomeAssistantConnectionOptions) {}

  public async sendAsync<T = unknown>(message: { type: string } & Record<string, unknown>): Promise<T> {
    this.touch();
    const socket = await this.getSocketAsync();
    const id = this.nextId++;
    return await new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new RequestError(
            { type: "timeout", reason: "aborted", code: "ECONNABORTED" },
            { cause: new Error(`Home Assistant command ${message.type} timed out`) },
          ),
        );
      }, COMMAND_TIMEOUT_MS);
      this.pending.set(id, { resolve: (value) => resolve(value as T), reject, timeout });
      socket.send(JSON.stringify({ ...message, id }));
    });
  }

  public async getStatesAsync(): Promise<ReadonlyMap<string, RawEntityState>> {
    this.touch();
    await this.ensureStatesAsync();
    return this.states;
  }

  public subscribeStates(listener: HomeAssistantStateListener) {
    this.stateListeners.add(listener);
    this.touch();
    void this.ensureStatesAsync().catch((error: unknown) => {
      if (!this.stateListeners.delete(listener)) return;
      listener.onError(error);
    });
    return () => {
      this.stateListeners.delete(listener);
      this.touch();
    };
  }

  public async getRegistryAsync(): Promise<HomeAssistantRegistry | null> {
    this.touch();
    if (this.registry && Date.now() - this.registry.fetchedAt < REGISTRY_TTL_MS) return await this.registry.value;

    const value = this.fetchRegistryAsync().then(
      (registry) => {
        this.lastRegistry = registry;
        return registry;
      },
      (error: unknown) => this.recoverRegistry(error),
    );
    this.registry = { value, fetchedAt: Date.now() };
    value.catch(() => {
      if (this.registry?.value === value) this.registry = undefined;
    });
    return await value;
  }

  private recoverRegistry(error: unknown): HomeAssistantRegistry | null {
    const reason = describeFailure(error);
    if (this.lastRegistry) {
      logger.warn("Home Assistant registry refresh failed, keeping the last known rooms", {
        key: this.options.key,
        reason,
      });
      return this.lastRegistry;
    }
    if (error instanceof HomeAssistantCommandError && UNSUPPORTED_REGISTRY_CODES.has(error.code)) {
      logger.warn("Home Assistant registry is not available to this token, rooms are disabled", {
        key: this.options.key,
        reason,
      });
      return null;
    }
    logger.warn("Home Assistant registry could not be loaded", { key: this.options.key, reason });
    throw error;
  }

  private async fetchRegistryAsync(): Promise<HomeAssistantRegistry> {
    const [areas, floors, devices, entities] = await Promise.all([
      this.sendAsync({ type: "config/area_registry/list" }),
      this.sendAsync({ type: "config/floor_registry/list" }).catch((error: unknown) => {
        if (!(error instanceof HomeAssistantCommandError) || error.code !== "unknown_command") throw error;
        logger.debug("Home Assistant has no floor registry, continuing without floors", { key: this.options.key });
        return [];
      }),
      this.sendAsync({ type: "config/device_registry/list" }),
      this.sendAsync({ type: "config/entity_registry/list_for_display" }),
    ]);
    return {
      areas: areaRegistrySchema.parse(areas),
      floors: floorRegistrySchema.parse(floors),
      devices: deviceRegistrySchema.parse(devices),
      entities: entityDisplayRegistrySchema.parse(entities),
    };
  }

  private ensureStatesAsync() {
    if (this.statesReady) return this.statesReady;

    const ready = new Promise<void>((resolve, reject) => {
      let initialized = false;
      let settled = false;
      let failed = false;
      let subscriptionId: number | undefined;
      let initTimer: NodeJS.Timeout | undefined;

      const settle = (error?: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(initTimer);
        if (this.rejectStatesInit === settle) this.rejectStatesInit = undefined;
        if (error === undefined) {
          resolve();
          return;
        }
        failed = true;
        if (subscriptionId !== undefined) this.dropSubscription(subscriptionId);
        reject(error);
      };
      this.rejectStatesInit = settle;

      this.subscribeAsync({ type: "subscribe_entities" }, (event) => {
        const parsed = compressedStateEventSchema.safeParse(event);
        if (!parsed.success) {
          logger.warn("Ignoring malformed Home Assistant entity event");
          return;
        }
        const change = this.applyCompressedEvent(parsed.data, !initialized);
        if (!initialized) {
          initialized = true;
          settle();
        }
        if (change.changed.length > 0 || change.removed.length > 0) {
          [...this.stateListeners].forEach((listener) => listener.onChange(change));
        }
      }).then(
        (id) => {
          subscriptionId = id;
          if (failed) {
            this.dropSubscription(id);
            return;
          }
          if (settled) return;
          initTimer = setTimeout(() => {
            settle(
              new RequestError(
                { type: "timeout", reason: "aborted", code: "ECONNABORTED" },
                { cause: new Error("Home Assistant did not send the initial entity states") },
              ),
            );
          }, STATES_INIT_TIMEOUT_MS);
        },
        (error: unknown) => settle(error),
      );
    });
    this.statesReady = ready;
    ready.catch(() => {
      if (this.statesReady === ready) this.statesReady = undefined;
    });
    return ready;
  }

  private dropSubscription(id: number) {
    if (!this.eventHandlers.delete(id)) return;
    void this.sendAsync({ type: "unsubscribe_events", subscription: id }).catch(() => undefined);
  }

  private async subscribeAsync(message: { type: string } & Record<string, unknown>, onEvent: (event: unknown) => void) {
    const socket = await this.getSocketAsync();
    const id = this.nextId++;
    this.eventHandlers.set(id, onEvent);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        this.eventHandlers.delete(id);
        reject(new Error(`Home Assistant subscription ${message.type} timed out`));
      }, COMMAND_TIMEOUT_MS);
      this.pending.set(id, {
        resolve: () => resolve(),
        reject: (error) => {
          this.eventHandlers.delete(id);
          reject(error);
        },
        timeout,
      });
      socket.send(JSON.stringify({ ...message, id }));
    });
    return id;
  }

  private applyCompressedEvent(
    event: ReturnType<typeof compressedStateEventSchema.parse>,
    replace: boolean,
  ): HomeAssistantStateChange {
    const changed = new Map<string, RawEntityState>();
    const removed: string[] = [];
    if (replace) this.states.clear();

    for (const [entityId, compressed] of Object.entries(event.a ?? {})) {
      const lastChanged = compressed.lc * 1000;
      const state: RawEntityState = {
        entityId,
        state: compressed.s,
        attributes: compressed.a,
        lastChanged,
        lastUpdated: compressed.lu === undefined ? lastChanged : compressed.lu * 1000,
      };
      this.states.set(entityId, state);
      changed.set(entityId, state);
    }

    for (const entityId of event.r ?? []) {
      if (this.states.delete(entityId)) removed.push(entityId);
    }

    for (const [entityId, diff] of Object.entries(event.c ?? {})) {
      const current = this.states.get(entityId);
      if (!current) continue;
      const attributes = { ...current.attributes, ...diff["+"]?.a };
      for (const key of diff["-"]?.a ?? []) delete attributes[key];
      const lastChanged = diff["+"]?.lc === undefined ? current.lastChanged : diff["+"].lc * 1000;
      const lastUpdated = diff["+"]?.lu ?? diff["+"]?.lc;
      const next: RawEntityState = {
        entityId,
        state: diff["+"]?.s ?? current.state,
        attributes,
        lastChanged,
        lastUpdated: lastUpdated === undefined ? current.lastUpdated : lastUpdated * 1000,
      };
      this.states.set(entityId, next);
      changed.set(entityId, next);
    }

    return { changed: [...changed.values()], removed };
  }

  private getSocketAsync() {
    if (this.socket) return this.socket;

    const socket = this.connectAsync();
    this.socket = socket;
    socket.then(
      (webSocket) => {
        webSocket.on("message", (raw) => this.handleMessage(raw));
        webSocket.once("close", () => this.handleClose(socket));
        webSocket.on("error", (error) => logger.debug("Home Assistant socket error", { error: error.message }));
      },
      () => {
        if (this.socket === socket) this.socket = undefined;
      },
    );
    return socket;
  }

  private async connectAsync() {
    const url = new URL(this.options.url);
    const socket = await openSocketAsync(url, await resolveCertificateOptionsAsync());
    try {
      await authenticateAsync(socket, this.options.token);
    } catch (error) {
      socket.close();
      throw error;
    }
    logger.debug("Connected to Home Assistant websocket", { key: this.options.key });
    return socket;
  }

  private handleMessage(raw: RawData) {
    const parsed = parseJson(raw);
    const messages = Array.isArray(parsed) ? parsed : [parsed];
    for (const message of messages) {
      if (!isRecord(message) || typeof message.id !== "number") continue;

      if (message.type === "event") {
        this.eventHandlers.get(message.id)?.(message.event);
        continue;
      }
      if (message.type !== "result") continue;

      const pending = this.pending.get(message.id);
      if (!pending) continue;
      clearTimeout(pending.timeout);
      this.pending.delete(message.id);

      if (message.success === true) {
        pending.resolve(message.result);
        continue;
      }
      const error = isRecord(message.error) ? message.error : {};
      pending.reject(
        new HomeAssistantCommandError(
          typeof error.code === "string" ? error.code : "unknown_error",
          typeof error.message === "string" ? error.message : "Home Assistant rejected the command",
          typeof error.translation_key === "string" ? error.translation_key : undefined,
        ),
      );
    }
  }

  private handleClose(socket: Promise<WebSocket>) {
    if (this.socket !== socket) return;
    this.socket = undefined;
    this.statesReady = undefined;
    this.states.clear();
    this.eventHandlers.clear();
    this.rejectStatesInit?.(connectionClosedError());
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(connectionClosedError());
    }
    this.pending.clear();
    const listeners = [...this.stateListeners];
    this.stateListeners.clear();
    logger.debug("Home Assistant websocket closed", { key: this.options.key, listeners: listeners.length });
    for (const listener of listeners) listener.onError(connectionClosedError());
  }

  private touch() {
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (this.stateListeners.size > 0) {
        this.touch();
        return;
      }
      this.close();
    }, IDLE_TIMEOUT_MS);
    this.idleTimer.unref();
  }

  private close() {
    clearTimeout(this.idleTimer);
    const socket = this.socket;
    this.socket = undefined;
    this.statesReady = undefined;
    this.rejectStatesInit?.(connectionClosedError());
    this.states.clear();
    this.eventHandlers.clear();
    this.registry = undefined;
    this.lastRegistry = undefined;
    HomeAssistantConnection.pool.delete(this.options.key);
    void socket?.then((webSocket) => webSocket.close()).catch(() => undefined);
  }
}

const openSocketAsync = async (url: URL, certificate: CertificateOptions) =>
  await new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket(url, {
      ca: certificate.ca,
      checkServerIdentity: certificate.checkServerIdentity as never,
      handshakeTimeout: CONNECT_TIMEOUT_MS,
    });
    socket.once("open", () => resolve(socket));
    socket.once("unexpected-response", (_request, response) => {
      reject(new ResponseError({ status: response.statusCode ?? 500, url: url.toString() }));
    });
    socket.once("error", (error: Error & { code?: string }) => {
      const matched = error.code ? matchErrorCode(error.code) : undefined;
      reject(matched ? new RequestError(matched, { cause: error }) : error);
    });
  });

const authenticateAsync = async (socket: WebSocket, token: string) =>
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(
        new RequestError(
          { type: "timeout", reason: "aborted", code: "ECONNABORTED" },
          { cause: new Error("Home Assistant authentication timed out") },
        ),
      );
    }, CONNECT_TIMEOUT_MS);

    const onMessage = (raw: RawData) => {
      const message = parseJson(raw);
      if (!isRecord(message)) return;
      if (message.type === "auth_ok") {
        cleanup();
        resolve();
        return;
      }
      if (message.type === "auth_invalid") {
        cleanup();
        reject(new ResponseError({ status: 401 }));
      }
    };
    const onClose = () => {
      cleanup();
      reject(connectionClosedError());
    };
    const cleanup = () => {
      clearTimeout(timeout);
      socket.off("message", onMessage);
      socket.off("close", onClose);
    };

    socket.on("message", onMessage);
    socket.once("close", onClose);
    socket.send(JSON.stringify({ type: "auth", access_token: token }));
  });

const resolveCertificateOptionsAsync = async (): Promise<CertificateOptions> => ({
  ca: await getAllTrustedCertificatesAsync(),
  checkServerIdentity: createCustomCheckServerIdentity(await getTrustedCertificateHostnamesAsync()),
});

const parseJson = (raw: RawData): unknown => {
  try {
    return JSON.parse(raw.toString());
  } catch {
    return undefined;
  }
};
