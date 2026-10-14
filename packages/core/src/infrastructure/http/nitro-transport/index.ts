import type { Agent, ClientRequest } from "node:http";
import type { Duplex } from "node:stream";

import type { ResourceHttpsAgent } from "../https-agent";
import { nativeTransportBoundaries, UnsupportedNativeTransportError } from "./boundaries";
import { createNativeOwnershipCapacity } from "./capacity";
import type { NativeOwnershipLimits } from "./capacity";

export { NativeTransportCapacityError, UnsupportedNativeTransportError } from "./boundaries";
export type { NativeTransportBoundary } from "./boundaries";
export type { NativeOwnershipLimits } from "./capacity";

export interface NativeTransportOwnershipResources {
  readonly httpAgent: Agent;
  readonly httpsAgent: ResourceHttpsAgent;
  readonly limits: NativeOwnershipLimits;
}

type OwnedFailure = { kind: "none" } | { kind: "failed"; error: unknown };

const rememberFailure = (
  owned: { failure: OwnedFailure; destructionFailure: OwnedFailure },
  error: unknown,
  field: "failure" | "destructionFailure" = "failure",
) => {
  if (owned[field].kind === "none") owned[field] = { kind: "failed", error };
};

interface OwnedStream {
  readonly stream: Duplex;
  readonly closedAsync: Promise<void>;
  failure: OwnedFailure;
  destructionFailure: OwnedFailure;
}

interface OwnedRequest {
  readonly settledAsync: Promise<void>;
  readonly requestClosedAsync: Promise<void>;
  readonly cancel: (reason?: unknown) => void;
  readonly stopTimerAndSignal: () => void;
  readonly quarantine: () => void;
  readonly rejectSettlement: (error: unknown) => void;
  request?: ClientRequest;
  requestClosed: boolean;
  releasedUndispatched: boolean;
  failure: OwnedFailure;
  destructionFailure: OwnedFailure;
}

export const createNativeTransportOwnershipAdapter = (resources: NativeTransportOwnershipResources) => {
  const limits = { ...resources.limits };
  const capacity = createNativeOwnershipCapacity(limits);
  const agents = [resources.httpAgent, resources.httpsAgent];
  const requests = new Set<OwnedRequest>();
  const streams = new Map<Duplex, OwnedStream>();
  const poolStreamLimit = limits.maxOwned * 2;
  const streamLimit = poolStreamLimit + limits.maxOwned * 2;
  const hold = new UnsupportedNativeTransportError(nativeTransportBoundaries);
  let retiring = false;
  let retirement: Promise<void> | undefined;
  let streamOverflow = false;

  const destroyStream = (owned: OwnedStream) => {
    if (owned.stream.closed) return;
    try {
      owned.stream.destroy();
    } catch (error) {
      rememberFailure(owned, error, "destructionFailure");
    }
  };

  const ownStream = (stream: Duplex): OwnedStream | undefined => {
    const existing = streams.get(stream);
    if (existing) return existing;
    if (stream.closed) return undefined;
    if (streams.size >= streamLimit) {
      streamOverflow = true;
      return undefined;
    }
    const closed = Promise.withResolvers<void>();
    const owned: OwnedStream = {
      stream,
      closedAsync: closed.promise,
      failure: { kind: "none" },
      destructionFailure: { kind: "none" },
    };
    streams.set(stream, owned);
    const onError = (error: Error) => {
      rememberFailure(owned, error);
    };
    const onClose = () => {
      stream.removeListener("error", onError);
      closed.resolve();
    };
    stream.on("error", onError);
    stream.once("close", onClose);
    if (stream.closed) {
      stream.removeListener("close", onClose);
      onClose();
    }
    if (retiring) destroyStream(owned);
    return owned;
  };

  const snapshotPools = () => {
    for (const agent of agents) {
      for (const pool of [agent.sockets, agent.freeSockets]) {
        for (const sockets of Object.values(pool)) {
          if (!sockets) continue;
          for (const socket of sockets) ownStream(socket);
        }
      }
    }
  };

  const reserveRequest = (options: { readonly signal?: AbortSignal; readonly caOverride?: unknown } = {}) => {
    if (options.caOverride !== undefined) throw new UnsupportedNativeTransportError(["q17-ca-override-undecided"]);
    options.signal?.throwIfAborted();
    const reservation = capacity.reserve();
    const settlement = Promise.withResolvers<void>();
    const requestClosed = Promise.withResolvers<void>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    let bound = false;
    const stopAcquisitionTimer = () => {
      clearTimeout(timer);
      timer = undefined;
    };
    const stopTimerAndSignal = () => {
      stopAcquisitionTimer();
      options.signal?.removeEventListener("abort", onAbort);
    };
    const releaseUndispatched = () => {
      if (bound) throw new Error("A bound native acquisition cannot release undispatched capacity");
      if (owned.releasedUndispatched) return;
      owned.releasedUndispatched = true;
      stopTimerAndSignal();
      reservation.releaseUndispatched();
      requests.delete(owned);
      requestClosed.resolve();
      settlement.resolve();
    };
    const cancel = (reason?: unknown) => {
      if (cancelled || owned.releasedUndispatched) return;
      cancelled = true;
      stopTimerAndSignal();
      if (!bound) {
        releaseUndispatched();
        return;
      }
      reservation.quarantine();
      if (owned.requestClosed) return;
      try {
        owned.request?.destroy(
          reason instanceof Error ? reason : new Error("Native request cancelled", { cause: reason }),
        );
      } catch (error) {
        rememberFailure(owned, error, "destructionFailure");
      }
    };
    const onAbort = () => cancel(options.signal?.reason);
    const owned: OwnedRequest = {
      settledAsync: settlement.promise,
      requestClosedAsync: requestClosed.promise,
      cancel,
      stopTimerAndSignal,
      quarantine: reservation.quarantine,
      rejectSettlement: settlement.reject,
      requestClosed: false,
      releasedUndispatched: false,
      failure: { kind: "none" },
      destructionFailure: { kind: "none" },
    };
    requests.add(owned);
    void settlement.promise.catch(() => undefined);
    timer = setTimeout(() => cancel(new Error("Native acquisition deadline exceeded")), limits.acquisitionTimeoutMs);
    timer.unref();
    options.signal?.addEventListener("abort", onAbort, { once: true });
    if (options.signal?.aborted) onAbort();

    return {
      kind: "unsupported" as const,
      boundaries: nativeTransportBoundaries,
      settledAsync: settlement.promise,
      cancel,
      releaseUndispatched,
      bindExistingRequest(request: ClientRequest) {
        if (bound || cancelled || retiring || owned.releasedUndispatched) throw hold;
        for (const previous of requests) {
          if (previous.request === request) throw new Error("Native request already has an ownership reservation");
        }
        bound = true;
        owned.request = request;
        const onError = (error: Error) => {
          rememberFailure(owned, error);
        };
        const onSocket = (stream: Duplex) => {
          ownStream(stream);
          reservation.activate();
          stopAcquisitionTimer();
          if (cancelled || retiring || request.destroyed) {
            reservation.quarantine();
            const physical = streams.get(stream);
            if (physical && (retiring || !owned.requestClosed)) destroyStream(physical);
          }
        };
        const onClose = () => {
          owned.requestClosed = true;
          requestClosed.resolve();
          stopTimerAndSignal();
          reservation.quarantine();
          request.removeListener("error", onError);
        };
        request.on("error", onError);
        request.once("socket", onSocket);
        request.once("close", onClose);
        if (request.closed) {
          request.removeListener("close", onClose);
          onClose();
        }
        if (request.socket) onSocket(request.socket);
        if (request.destroyed) cancel(new Error("Native request was already destroyed"));
        return { kind: "unsupported" as const, boundaries: nativeTransportBoundaries };
      },
    };
  };

  const drainAsync = () => {
    if (retirement) return retirement;
    retiring = true;
    capacity.retire();
    const completion = Promise.withResolvers<void>();
    retirement = completion.promise;
    void retirement.catch(() => undefined);
    const failures: unknown[] = [hold];
    const independent = Promise.withResolvers<void>();
    const stopJoin = Promise.withResolvers<void>();
    let independentFinished = false;
    let finished = false;
    const finish = (timedOut: boolean) => {
      if (finished) return;
      finished = true;
      clearTimeout(drainTimer);
      stopJoin.resolve();
      if (timedOut) failures.push(new Error("Native physical drain deadline exceeded; ownership remains quarantined"));
      if (streamOverflow)
        failures.push(new Error("Native stream observation capacity exceeded; pool ownership remains held"));
      for (const owned of requests) {
        owned.stopTimerAndSignal();
        owned.quarantine();
        if (owned.failure.kind === "failed") failures.push(owned.failure.error);
        if (owned.destructionFailure.kind === "failed") failures.push(owned.destructionFailure.error);
      }
      for (const owned of streams.values()) {
        if (owned.failure.kind === "failed") failures.push(owned.failure.error);
        if (owned.destructionFailure.kind === "failed") failures.push(owned.destructionFailure.error);
      }
      const error = new AggregateError(failures, "Native transport retirement remains held");
      for (const owned of requests) owned.rejectSettlement(error);
      completion.reject(error);
    };
    const drainTimer = setTimeout(() => finish(true), limits.drainTimeoutMs);
    try {
      snapshotPools();
    } catch (error) {
      failures.push(error);
    }
    for (const owned of requests) owned.cancel(new Error("Native transport retired"));
    for (const agent of agents) {
      try {
        agent.destroy();
      } catch (error) {
        failures.push(error);
      }
    }
    for (const owned of streams.values()) destroyStream(owned);
    try {
      void resources.httpsAgent.waitForConnectionsClosedAsync().then(
        () => {
          independentFinished = true;
          independent.resolve();
        },
        (error: unknown) => {
          failures.push(error);
          independentFinished = true;
          independent.resolve();
        },
      );
    } catch (error) {
      failures.push(error);
      independentFinished = true;
      independent.resolve();
    }
    const joinObservedAsync = async () => {
      while (!finished) {
        snapshotPools();
        const observed = [...streams.values()];
        await Promise.race([
          Promise.allSettled([
            ...observed.map((owned) => owned.closedAsync),
            ...[...requests].map((owned) => owned.requestClosedAsync),
            independent.promise,
          ]),
          stopJoin.promise,
        ]);
        if (finished) return;
        snapshotPools();
        if (
          independentFinished &&
          [...streams.values()].every((owned) => owned.stream.closed) &&
          [...requests].every((owned) => owned.requestClosed)
        ) {
          finish(false);
          return;
        }
      }
    };
    void joinObservedAsync().catch((error: unknown) => {
      failures.push(error);
      finish(false);
    });
    return retirement;
  };

  return {
    kind: "unsupported" as const,
    boundaries: nativeTransportBoundaries,
    reserveRequest,
    drainAsync,
    disposeAsync: drainAsync,
    snapshot: () => ({
      ...capacity.snapshot(),
      observedStreams: streams.size,
      physicallyOpenObservedStreams: [...streams.values()].filter((owned) => !owned.stream.closed).length,
      streamOverflow,
      physicalSettlement: "unsupported" as const,
    }),
  };
};
