import type { ClientRequest } from "node:http";
import type { AgentOptions, RequestOptions } from "node:https";
import { Agent } from "node:https";
import type { Duplex } from "node:stream";

import { createOwnedHttpsProxyConnection } from "./proxy-connector";
import type { NativeHttpsTlsRoles } from "./proxy-connector";

export interface ResourceHttpsAgentOptions extends AgentOptions {
  nativeTlsRoles?: NativeHttpsTlsRoles;
}

export class ResourceHttpsAgent extends Agent {
  private retired = false;
  private connectingRequest: ClientRequest | undefined;
  private connections = new Map<Duplex, Promise<void>>();
  private retirementFailures: unknown[] = [];
  private admissions = new Map<ClientRequest, { closedAsync: Promise<void>; cancel: () => void }>();
  private proxyConnections = new Map<
    ReturnType<typeof createOwnedHttpsProxyConnection>,
    { closedAsync: Promise<void>; settled: boolean }
  >();
  private readonly nativeTlsRoles: NativeHttpsTlsRoles | undefined;
  private proxyRequests = new WeakSet<ClientRequest>();

  constructor(options: ResourceHttpsAgentOptions = {}) {
    const { nativeTlsRoles, ...nativeOptions } = options;
    super(nativeOptions);
    this.nativeTlsRoles = nativeTlsRoles;
  }

  addRequest(request: ClientRequest, options: RequestOptions) {
    if (this.retired || request.destroyed) {
      request.destroy(new Error("Certificate HTTPS admission is retired"));
      return;
    }
    const closed = Promise.withResolvers<void>();
    const release = () => {
      request.removeListener("socket", release);
      request.removeListener("close", release);
      this.admissions.delete(request);
      closed.resolve();
    };
    const cancel = () => {
      try {
        request.destroy(new Error("Certificate HTTPS admission is retired"));
      } catch (error) {
        this.retirementFailures.push(error);
      }
    };
    this.admissions.set(request, { closedAsync: closed.promise, cancel });
    request.once("socket", release);
    request.once("close", release);
    const native = Agent.prototype;
    try {
      if (!("addRequest" in native) || typeof native.addRequest !== "function")
        throw new Error("Native HTTPS request admission is unavailable");
      Reflect.apply(native.addRequest, this, [request, options]);
    } catch (error) {
      cancel();
      release();
      throw error;
    }
  }

  createProxyConnection(
    request: ClientRequest,
    options: RequestOptions,
    proxy: URL,
    callback: (error: Error | null, stream?: Duplex) => void,
  ) {
    if (!this.nativeTlsRoles) throw new Error("Native HTTPS proxy TLS roles are unavailable");
    if (
      !this.admissions.has(request) ||
      this.connectingRequest !== request ||
      this.proxyRequests.has(request) ||
      this.retired ||
      request.destroyed
    )
      throw new Error("Native HTTPS proxy request has no live admission");
    this.proxyRequests.add(request);
    const connection = createOwnedHttpsProxyConnection({
      request,
      options,
      proxy,
      tls: this.nativeTlsRoles,
      assertCurrent: () => {
        if (this.retired || request.destroyed) throw new Error("Native HTTPS proxy admission is retired");
      },
      onQuarantine: () => {
        this.retired = true;
      },
      callback,
    });
    const owned = { closedAsync: connection.closedAsync, settled: false };
    this.proxyConnections.set(connection, owned);
    void connection.closedAsync.then(
      () => this.proxyConnections.delete(connection),
      (error: unknown) => {
        owned.settled = true;
        this.retired = true;
        this.retirementFailures.push(error);
      },
    );
    connection.start();
  }

  private destroyConnection(stream: Duplex, error?: Error) {
    try {
      stream.destroy(error);
    } catch (failure) {
      this.retirementFailures.push(failure);
    }
  }

  createSocket(
    request: ClientRequest,
    options: RequestOptions,
    callback: (error: Error | null, stream?: Duplex) => void,
  ) {
    if (this.retired || request.destroyed) {
      callback(new Error("Certificate HTTPS connection is retired"));
      return;
    }
    const previous = this.connectingRequest;
    this.connectingRequest = request;
    try {
      const native = Agent.prototype;
      if (!("createSocket" in native) || typeof native.createSocket !== "function")
        throw new Error("Native HTTPS socket admission is unavailable");
      Reflect.apply(native.createSocket, this, [request, options, callback]);
    } finally {
      this.connectingRequest = previous;
    }
  }

  createConnection(options: RequestOptions, callback?: (error: Error | null, stream: Duplex) => void) {
    if (this.retired) throw new Error("Certificate HTTPS agent is retired");
    const request = this.connectingRequest;
    const pending = new Set<Duplex>();
    const originalDestroy = request?.destroy;
    let delivered = false;
    let completed = false;
    let completedStream: Duplex | undefined;
    const restore = () => {
      delivered = true;
      completed = true;
      pending.clear();
      if (request && originalDestroy && request.destroy === destroyRequest) request.destroy = originalDestroy;
      request?.removeListener("socket", restore);
      request?.removeListener("close", restore);
    };
    const destroyPending = (error?: Error) => {
      for (const stream of pending) this.destroyConnection(stream, error);
    };
    const destroyRequest = function (this: ClientRequest, error?: Error) {
      destroyPending(error);
      if (!originalDestroy) throw new Error("Certificate HTTPS request has no destroy handler");
      return originalDestroy.call(this, error);
    };
    if (request) {
      request.destroy = destroyRequest;
      request.once("socket", restore);
      request.once("close", restore);
    }
    const track = (stream: Duplex) => {
      if (!this.connections.has(stream) && !stream.closed) {
        const closed = new Promise<void>((resolve) =>
          stream.once("close", () => {
            this.connections.delete(stream);
            pending.delete(stream);
            resolve();
            if (!completed) finish(new Error("Certificate HTTPS connection closed before delivery"), stream);
          }),
        );
        this.connections.set(stream, closed);
      }
      if (!delivered) pending.add(stream);
      if (this.retired || request?.destroyed) this.destroyConnection(stream);
    };
    const finish = (error: Error | null, stream: Duplex) => {
      if (stream) track(stream);
      if (completed) {
        if (stream && (stream !== completedStream || this.retired || request?.destroyed))
          this.destroyConnection(stream);
        return;
      }
      completed = true;
      completedStream = stream;
      const failure =
        error ?? (this.retired || request?.destroyed ? new Error("Certificate HTTPS connection is retired") : null);
      if (failure && stream) this.destroyConnection(stream);
      try {
        callback?.(failure, stream);
      } catch (callbackError) {
        this.retirementFailures.push(callbackError);
        destroyPending();
        if (stream) this.destroyConnection(stream);
        restore();
      }
    };
    try {
      const stream = super.createConnection(options, finish);
      if (stream) track(stream);
      return stream;
    } catch (error) {
      destroyPending();
      restore();
      throw error;
    }
  }

  async waitForConnectionsClosedAsync() {
    while (
      this.connections.size ||
      this.admissions.size ||
      [...this.proxyConnections.values()].some((connection) => !connection.settled)
    ) {
      await Promise.allSettled([
        ...this.connections.values(),
        ...[...this.admissions.values()].map((admission) => admission.closedAsync),
        ...[...this.proxyConnections.values()]
          .filter((connection) => !connection.settled)
          .map((connection) => connection.closedAsync),
      ]);
    }
    if (this.retirementFailures.length)
      throw new AggregateError(this.retirementFailures, "Certificate HTTPS retirement failed");
  }

  destroy() {
    this.retired = true;
    for (const admission of this.admissions.values()) admission.cancel();
    for (const connection of this.proxyConnections.keys()) connection.cancel();
    for (const stream of this.connections.keys()) {
      this.destroyConnection(stream);
    }
    try {
      super.destroy();
    } catch (error) {
      this.retirementFailures.push(error);
    }
    if (this.retirementFailures.length)
      throw new AggregateError(this.retirementFailures, "Certificate HTTPS retirement failed");
  }
}
