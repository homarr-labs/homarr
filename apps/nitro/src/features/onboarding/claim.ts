import { resolveBrowserRpcEndpoint } from "../../client/rpc-link";

export type ClaimResult =
  | { kind: "ready"; expiresAt: number }
  | { kind: "locked"; expiresAt?: number }
  | { kind: "signIn" }
  | { kind: "finished" }
  | { kind: "error" };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function expiry(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

export async function claimOnboarding(signal: AbortSignal): Promise<ClaimResult> {
  const response = await fetch("/api/onboarding/claim", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });
  const body: unknown = await response.json().catch(() => null);
  if (!record(body)) return { kind: "error" };
  const expiresAt = expiry(body.expiresAt);
  if (response.ok) {
    if ((body.status !== "issued" && body.status !== "active") || !expiresAt || expiresAt <= Date.now()) {
      return { kind: "error" };
    }
    return { kind: "ready", expiresAt };
  }
  if (body.code === "locked") return { kind: "locked", expiresAt };
  if (body.code === "administrator_required") return { kind: "signIn" };
  if (body.code === "finished") return { kind: "finished" };
  return { kind: "error" };
}

export type OnboardingPostPath =
  | "/api/onboarding/claim"
  | "/rpc/onboard/nextStep"
  | "/rpc/user/initUser"
  | "/rpc/group/createInitialExternalGroup";

export interface OnboardingPostCall {
  readonly signal: AbortSignal;
  headersAsync(): Promise<Headers>;
  fetchAsync(url: string, init: RequestInit): Promise<Response>;
}

export interface OnboardingCsrfOwner {
  readonly origin: string;
  readonly state: "active" | "resetting" | "disposed";
  readonly serverOutcome: "not-observed" | "unknown";
  assertCurrent(): void;
  runPostAsync<Result>(
    path: OnboardingPostPath,
    signal: AbortSignal | undefined,
    execute: (call: OnboardingPostCall) => Promise<Result>,
  ): Promise<Result>;
  resetAsync(): Promise<void>;
  disposeAsync(): Promise<void>;
}

const owners = new WeakSet<OnboardingCsrfOwner>();

export function assertOnboardingCsrfOwner(owner: OnboardingCsrfOwner): void {
  if (!owners.has(owner)) throw new Error("Onboarding transport requires a constructed CSRF owner");
  owner.assertCurrent();
}

interface CsrfToken {
  readonly value: string;
  readonly expiresAt: number;
}

interface CsrfRead {
  readonly controller: AbortController;
  readonly task: Promise<CsrfToken>;
  consumers: number;
  settled: boolean;
}

function waitForTask<Result>(task: Promise<Result>, signal: AbortSignal): Promise<Result> {
  signal.throwIfAborted();
  return new Promise<Result>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    void task.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        if (signal.aborted) reject(signal.reason);
        else resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

function readCsrfToken(value: unknown): CsrfToken {
  if (!record(value) || Object.keys(value).length !== 1 || typeof value.token !== "string") {
    throw new Error("Onboarding CSRF response is invalid");
  }
  const match = /^([a-f0-9]{64})\.([1-9][0-9]*)$/.exec(value.token);
  const expires = match?.[2];
  const expiresAt = Number(expires);
  if (
    !expires ||
    value.token.length > 160 ||
    !Number.isSafeInteger(expiresAt) ||
    String(expiresAt) !== expires ||
    expiresAt <= Date.now()
  ) {
    throw new Error("Onboarding CSRF response is invalid");
  }
  return Object.freeze({ value: value.token, expiresAt });
}

function assertJsonResponse(response: Response): void {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(response.headers.get("content-type") ?? "")) {
    throw new Error("Onboarding response is not JSON");
  }
}

function assertFiniteResponse(response: Response, bytes: Uint8Array): void {
  const hint = response.headers.get("standard-server");
  if (hint !== null && hint !== "json" && hint !== "none") {
    throw new Error("Onboarding response body type is unavailable");
  }
  if (hint === "none") {
    if (bytes.byteLength !== 0) throw new Error("Onboarding absent response contains bytes");
    return;
  }
  if (hint === null && response.headers.get("content-type") === null && bytes.byteLength === 0) return;
  assertJsonResponse(response);
}

export function createOnboardingCsrfOwner(lifetime: AbortSignal): OnboardingCsrfOwner {
  const endpoint = resolveBrowserRpcEndpoint("/api/onboarding/claim");
  const origin = endpoint.origin;
  lifetime.throwIfAborted();
  let state: OnboardingCsrfOwner["state"] = "active";
  let serverOutcome: OnboardingCsrfOwner["serverOutcome"] = "not-observed";
  let generation = 0;
  let controller = new AbortController();
  let cached: CsrfToken | undefined;
  let reading: CsrfRead | undefined;
  let reservations = 0;
  let changed = Promise.withResolvers<void>();
  let transition: Promise<void> | undefined;
  let disposal: Promise<void> | undefined;
  let cleanup: { kind: "none" } | { kind: "failed"; error: unknown } = { kind: "none" };
  const pending = new Set<Promise<unknown>>();

  function recordCleanup(error: unknown): void {
    if (cleanup.kind === "none") cleanup = { kind: "failed", error };
  }

  function notify(): void {
    const previous = changed;
    changed = Promise.withResolvers<void>();
    previous.resolve();
  }

  function stopAdmission(): void {
    cached = undefined;
    generation += 1;
    controller.abort();
    reading?.controller.abort();
    notify();
  }

  function assertCurrent(): void {
    lifetime.throwIfAborted();
    if (window.location.origin !== origin) {
      if (state === "active") {
        state = "resetting";
        stopAdmission();
      }
      throw new Error("Onboarding transport origin changed");
    }
    if (state !== "active" || cleanup.kind === "failed") throw new Error("Onboarding transport is unavailable");
  }

  function track<Result>(work: () => Promise<Result>, local?: Set<Promise<unknown>>): Promise<Result> {
    const task = Promise.resolve().then(work);
    pending.add(task);
    local?.add(task);
    void task.then(
      () => {
        pending.delete(task);
        local?.delete(task);
      },
      () => {
        pending.delete(task);
        local?.delete(task);
      },
    );
    return task;
  }

  async function drain(tasks: Set<Promise<unknown>>): Promise<void> {
    while (tasks.size > 0) await Promise.allSettled([...tasks]);
  }

  async function cancelBody(response: Response, local?: Set<Promise<unknown>>): Promise<void> {
    const body = response.body;
    if (!body || response.bodyUsed) return;
    try {
      await track(() => body.cancel(), local);
    } catch (error: unknown) {
      recordCleanup(error);
      throw error;
    }
  }

  async function readFiniteBody(
    response: Response,
    signal: AbortSignal,
    local?: Set<Promise<unknown>>,
  ): Promise<Uint8Array<ArrayBuffer>> {
    const body = response.body;
    if (!body) {
      signal.throwIfAborted();
      return new Uint8Array(0);
    }
    const reader = body.getReader();
    const observations: {
      read: { kind: "none" } | { kind: "failed"; error: unknown };
      closed: { kind: "none" } | { kind: "failed"; error: unknown };
      cancel: { kind: "none" } | { kind: "failed"; error: unknown };
      cancelRead: { kind: "none" } | { kind: "failed"; error: unknown };
    } = {
      read: { kind: "none" },
      closed: { kind: "none" },
      cancel: { kind: "none" },
      cancelRead: { kind: "none" },
    };
    const closed = track(() => {
      const actualClosed = reader.closed;
      return actualClosed.then(undefined, (error: unknown) => {
        observations.closed = { kind: "failed", error };
        throw error;
      });
    }, local);
    let cancellation: Promise<void> | undefined;
    let primary: { kind: "none" } | { kind: "failed"; error: unknown } = { kind: "none" };
    const cleanupCauses: unknown[] = [];
    function noteCleanup(error: unknown): void {
      recordCleanup(error);
      if (!cleanupCauses.some((cause) => Object.is(cause, error))) cleanupCauses.push(error);
    }
    const cancel = (reason: unknown) => {
      cancellation ??= track(() => {
        observations.cancelRead = observations.read;
        const actualCancel = reader.cancel(reason);
        return actualCancel.then(undefined, (error: unknown) => {
          observations.cancel = { kind: "failed", error };
          throw error;
        });
      }, local);
    };
    const abort = () => cancel(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      signal.throwIfAborted();
      while (true) {
        const chunk = await track(() => {
          const actualRead = reader.read();
          return actualRead.then(undefined, (error: unknown) => {
            if (observations.read.kind === "none") observations.read = { kind: "failed", error };
            throw error;
          });
        }, local);
        signal.throwIfAborted();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 65_536) throw new Error("Onboarding response is too large");
        chunks.push(chunk.value);
      }
    } catch (error: unknown) {
      primary = { kind: "failed", error };
      cancel(error);
    }
    signal.removeEventListener("abort", abort);
    const terminalTasks = [closed];
    if (cancellation) terminalTasks.push(cancellation);
    const terminals = await Promise.allSettled(terminalTasks);
    const closedTerminal = terminals[0];
    if (closedTerminal?.status === "rejected") {
      const readReplay =
        observations.read.kind === "failed" &&
        observations.closed.kind === "failed" &&
        Object.is(closedTerminal.reason, observations.closed.error) &&
        Object.is(observations.closed.error, observations.read.error);
      if (!readReplay) noteCleanup(closedTerminal.reason);
    }
    const cancelTerminal = terminals[1];
    if (cancelTerminal?.status === "rejected") {
      const readReplay =
        observations.read.kind === "failed" &&
        observations.cancelRead.kind === "failed" &&
        observations.closed.kind === "failed" &&
        observations.cancel.kind === "failed" &&
        closedTerminal?.status === "rejected" &&
        Object.is(observations.cancelRead.error, observations.read.error) &&
        Object.is(closedTerminal.reason, observations.read.error) &&
        Object.is(observations.closed.error, observations.read.error) &&
        Object.is(cancelTerminal.reason, observations.read.error) &&
        Object.is(observations.cancel.error, observations.read.error);
      if (!readReplay) noteCleanup(cancelTerminal.reason);
    }
    try {
      await track(async () => reader.releaseLock(), local);
    } catch (error: unknown) {
      noteCleanup(error);
    }
    try {
      signal.throwIfAborted();
    } catch (error: unknown) {
      if (primary.kind === "none") primary = { kind: "failed", error };
    }
    const errors: unknown[] = [];
    if (primary.kind === "failed") errors.push(primary.error);
    for (const cause of cleanupCauses) {
      if (!errors.some((error) => Object.is(error, cause))) errors.push(cause);
    }
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) {
      throw new AggregateError(errors, "Onboarding response settlement failed", { cause: errors[0] });
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  }

  function startRead(): CsrfRead {
    const capturedGeneration = generation;
    const readController = new AbortController();
    const signal = AbortSignal.any([lifetime, controller.signal, readController.signal]);
    const task = track(async () => {
      assertCurrent();
      signal.throwIfAborted();
      const response = await track(() =>
        fetch(endpoint.href, {
          method: "GET",
          credentials: "same-origin",
          redirect: "error",
          cache: "no-store",
          signal,
        }),
      );
      let bytes: Uint8Array<ArrayBuffer>;
      try {
        bytes = await readFiniteBody(response, signal);
      } finally {
        await cancelBody(response);
      }
      assertCurrent();
      signal.throwIfAborted();
      if (generation !== capturedGeneration || response.status !== 200) {
        throw new Error("Onboarding CSRF response is unavailable");
      }
      assertJsonResponse(response);
      const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
      const token = readCsrfToken(value);
      cached = token;
      return token;
    });
    const read: CsrfRead = { controller: readController, task, consumers: 0, settled: false };
    reading = read;
    void task.then(
      () => {
        read.settled = true;
        if (reading === read) reading = undefined;
        notify();
      },
      () => {
        read.settled = true;
        cached = undefined;
        if (reading === read) reading = undefined;
        notify();
      },
    );
    return read;
  }

  async function tokenAsync(signal: AbortSignal): Promise<CsrfToken> {
    while (true) {
      assertCurrent();
      signal.throwIfAborted();
      if (cached && cached.expiresAt > Date.now() && !reading) return cached;
      cached = undefined;
      if (!reading && reservations > 0) {
        await waitForTask(changed.promise, signal);
        continue;
      }
      const read = reading ?? startRead();
      read.consumers += 1;
      try {
        return await waitForTask(read.task, signal);
      } finally {
        read.consumers -= 1;
        if (read.consumers === 0 && !read.settled) read.controller.abort();
      }
    }
  }

  function runPostAsync<Result>(
    path: OnboardingPostPath,
    callerSignal: AbortSignal | undefined,
    execute: (call: OnboardingPostCall) => Promise<Result>,
  ): Promise<Result> {
    assertCurrent();
    if (
      path !== "/api/onboarding/claim" &&
      path !== "/rpc/onboard/nextStep" &&
      path !== "/rpc/user/initUser" &&
      path !== "/rpc/group/createInitialExternalGroup"
    ) {
      throw new Error("Onboarding POST path is unavailable");
    }
    callerSignal?.throwIfAborted();
    const capturedGeneration = generation;
    const signals = [lifetime, controller.signal];
    if (callerSignal) signals.push(callerSignal);
    const signal = AbortSignal.any(signals);
    const local = new Set<Promise<unknown>>();
    let active = true;
    let token: CsrfToken | undefined;
    let headersStarted = false;
    let sent = false;
    let reserved = false;
    let returned: Response | undefined;

    function check(): void {
      assertCurrent();
      signal.throwIfAborted();
      if (!active || generation !== capturedGeneration) throw new Error("Onboarding call is retired");
    }

    const call = Object.freeze<OnboardingPostCall>({
      signal,
      headersAsync() {
        check();
        if (headersStarted) throw new Error("Onboarding headers are single-use");
        headersStarted = true;
        return track(async () => {
          const prepared = await tokenAsync(signal);
          check();
          if (reading || cached !== prepared || prepared.expiresAt <= Date.now()) {
            throw new Error("Onboarding CSRF generation changed");
          }
          token = prepared;
          reserved = true;
          reservations += 1;
          return new Headers({ "x-homarr-csrf-token": prepared.value });
        }, local);
      },
      fetchAsync(url, init) {
        check();
        const target = resolveBrowserRpcEndpoint(url);
        if (
          !reserved ||
          !token ||
          sent ||
          token.expiresAt <= Date.now() ||
          target.origin !== origin ||
          target.pathname !== path ||
          init.method !== "POST" ||
          init.signal !== signal ||
          new Headers(init.headers).get("x-homarr-csrf-token") !== token.value
        ) {
          throw new Error("Onboarding POST transport is unavailable");
        }
        sent = true;
        return track(async () => {
          check();
          if (!token || token.expiresAt <= Date.now()) throw new Error("Onboarding CSRF token expired");
          serverOutcome = "unknown";
          const response = await track(
            () => fetch(target.href, { ...init, credentials: "same-origin", redirect: "error", cache: "no-store" }),
            local,
          );
          let bytes: Uint8Array<ArrayBuffer>;
          try {
            bytes = await readFiniteBody(response, signal, local);
          } finally {
            await cancelBody(response, local);
          }
          check();
          assertFiniteResponse(response, bytes);
          let responseBody: BodyInit | null = bytes;
          if (response.body === null) responseBody = null;
          returned = new Response(responseBody, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
          return returned;
        }, local);
      },
    });

    return track(async () => {
      try {
        check();
        const result = await execute(call);
        check();
        return result;
      } catch (error: unknown) {
        cached = undefined;
        throw error;
      } finally {
        active = false;
        await drain(local);
        try {
          if (returned) await cancelBody(returned, local);
        } finally {
          if (reserved) {
            reservations -= 1;
            notify();
          }
          token = undefined;
          returned = undefined;
        }
      }
    });
  }

  async function finishRetirement(): Promise<void> {
    await drain(pending);
    if (cleanup.kind === "failed") throw cleanup.error;
  }

  const owner: OnboardingCsrfOwner = Object.freeze<OnboardingCsrfOwner>({
    origin,
    get state() {
      return state;
    },
    get serverOutcome() {
      return serverOutcome;
    },
    assertCurrent,
    runPostAsync,
    resetAsync(): Promise<void> {
      if (state === "disposed") return owner.disposeAsync();
      if (transition) return transition;
      state = "resetting";
      stopAdmission();
      transition = Promise.resolve().then(async () => {
        await finishRetirement();
        lifetime.throwIfAborted();
        if (state === "disposed" || window.location.origin !== origin) {
          throw new Error("Onboarding transport is retired");
        }
        controller = new AbortController();
        state = "active";
        transition = undefined;
      });
      void transition.catch(() => undefined);
      return transition;
    },
    disposeAsync() {
      if (disposal) return disposal;
      state = "disposed";
      stopAdmission();
      lifetime.removeEventListener("abort", dispose);
      disposal = Promise.resolve().then(finishRetirement);
      void disposal.catch(() => undefined);
      return disposal;
    },
  });

  function dispose(): void {
    void owner.disposeAsync().catch(() => undefined);
  }

  lifetime.addEventListener("abort", dispose, { once: true });
  owners.add(owner);
  return owner;
}

export function createOwnerBoundOnboardingClaim(owner: OnboardingCsrfOwner) {
  assertOnboardingCsrfOwner(owner);
  return async function claim(signal: AbortSignal): Promise<ClaimResult> {
    const result = await owner.runPostAsync<ClaimResult>("/api/onboarding/claim", signal, async (call) => {
      const headers = await call.headersAsync();
      const response = await call.fetchAsync("/api/onboarding/claim", { method: "POST", headers, signal: call.signal });
      try {
        assertJsonResponse(response);
      } catch {
        return { kind: "error" };
      }
      const body: unknown = await response.json().catch(() => null);
      call.signal.throwIfAborted();
      if (!record(body)) return { kind: "error" };
      const expiresAt = expiry(body.expiresAt);
      if (response.status === 200) {
        if ((body.status !== "issued" && body.status !== "active") || !expiresAt || expiresAt <= Date.now()) {
          return { kind: "error" };
        }
        return { kind: "ready", expiresAt };
      }
      if (response.status === 423 && body.code === "locked" && expiresAt) return { kind: "locked", expiresAt };
      if (response.status === 403 && body.code === "administrator_required") return { kind: "signIn" };
      if (response.status === 409 && body.code === "finished") return { kind: "finished" };
      return { kind: "error" };
    });
    if (result.kind === "error" || result.kind === "signIn" || result.kind === "finished") {
      await owner.resetAsync();
      signal.throwIfAborted();
    }
    return result;
  };
}
