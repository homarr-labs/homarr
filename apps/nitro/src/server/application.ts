import type { Application, ApplicationOptions, FetchContribution } from "../contracts/contribution";
import { dispatchPhases } from "../contracts/contribution";
import type { RequestContext, ResponseEffect } from "../contracts/request";

export function createApplication(options: ApplicationOptions = {}): Application {
  const contributions = options.contributions ?? [];
  if (new Set(contributions.map(({ id }) => id)).size !== contributions.length) {
    throw new Error("Duplicate runtime contribution");
  }
  const routes = contributions
    .flatMap((contribution) => contribution.routes ?? [])
    .toSorted((left, right) => dispatchPhases.indexOf(left.phase) - dispatchPhases.indexOf(right.phase));
  const lifetime = new AbortController();
  const active = new Set<Promise<void>>();
  let readiness: Promise<void> | undefined;
  let disposal: Promise<void> | undefined;

  function report(error: unknown, requestId: string): void {
    try {
      options.reportError?.(error, requestId);
    } catch {}
  }

  function ready(): Promise<void> {
    readiness ??= (async () => {
      for (const contribution of contributions) {
        lifetime.signal.throwIfAborted();
        await contribution.ready?.(lifetime.signal);
      }
    })();
    return readiness;
  }

  async function handle(request: Request, complete: () => void): Promise<Response> {
    const requestId = crypto.randomUUID();
    const signal = AbortSignal.any([request.signal, lifetime.signal]);
    const effects: ResponseEffect[] = [];
    const disposers: (() => void | Promise<void>)[] = [];
    const memo = new Map<symbol, Promise<unknown>>();
    let cleanup: Promise<void> | undefined;
    let ownedResponse: Response | undefined;

    async function discardResponse(reason?: unknown): Promise<void> {
      const response = ownedResponse;
      ownedResponse = undefined;
      await response?.body?.cancel(reason);
    }

    function disposeRequest(): Promise<void> {
      cleanup ??= (async () => {
        for (const dispose of disposers.toReversed()) {
          try {
            await dispose();
          } catch (error) {
            report(error, requestId);
          }
        }
        memo.clear();
        complete();
      })();
      return cleanup;
    }

    async function respond(
      response: Response,
      suppliedEffects: readonly ResponseEffect[] = effects,
    ): Promise<Response> {
      ownedResponse = response;
      signal.throwIfAborted();
      const finalized = finalize(request, response, suppliedEffects);
      if (request.method === "HEAD") await discardResponse();
      const retained = await retainRequest(finalized, signal, disposeRequest, (error) => report(error, requestId));
      ownedResponse = undefined;
      return retained;
    }

    try {
      signal.throwIfAborted();
      await ready();
      signal.throwIfAborted();
      const principal = Object.freeze({
        ...((await options.services?.resolvePrincipal?.({ request, requestId, signal })) ?? {
          kind: "anonymous" as const,
        }),
      });
      const setup = Object.freeze({
        ...((await options.services?.resolveSetup?.({ requestId, signal })) ?? { kind: "unavailable" as const }),
      });
      const context: RequestContext = {
        request,
        requestId,
        signal,
        principal,
        setup,
        memoize<T>(key: symbol, read: () => Promise<T>): Promise<T> {
          if (!memo.has(key)) memo.set(key, read());
          return memo.get(key) as Promise<T>;
        },
        effect(effect) {
          signal.throwIfAborted();
          effects.push(effect);
        },
        onDispose(dispose) {
          disposers.push(dispose);
        },
        async authorize(requirement) {
          signal.throwIfAborted();
          if (requirement.kind === "public") return { kind: "allow" };
          if (principal.kind === "anonymous") return { kind: "deny", status: 401 };
          return (await options.services?.authorize?.(principal, requirement, signal)) ?? { kind: "deny", status: 403 };
        },
      };
      const pathname = new URL(request.url).pathname;
      for (const route of routes) {
        if (!matches(route, pathname)) continue;
        const decision = await context.authorize(route.access);
        if (decision.kind === "deny")
          return await respond(Response.json({ code: "ACCESS_DENIED" }, { status: decision.status }));
        const result = await route.handle(context);
        if (result.kind === "response") return await respond(result.response);
        signal.throwIfAborted();
      }
      if (/^\/(?:api|rpc|auth|streams|binary|assets)(?:\/|$)/.test(pathname)) {
        return await respond(Response.json({ code: "NOT_FOUND" }, { status: 404 }));
      }
      const response = (await options.render?.(context)) ?? new Response("Not found", { status: 404 });
      return await respond(response);
    } catch (error) {
      report(error, requestId);
      try {
        await discardResponse(error);
      } catch (cancellationError) {
        report(cancellationError, requestId);
      }
      const response = finalize(
        request,
        Response.json(
          { code: signal.aborted ? "REQUEST_ABORTED" : "INTERNAL_ERROR" },
          {
            status: signal.aborted ? 499 : 500,
          },
        ),
        [],
      );
      await disposeRequest();
      return response;
    }
  }

  return {
    ready,
    fetch(request) {
      if (disposal) return Promise.resolve(finalize(request, new Response("Service unavailable", { status: 503 }), []));
      const finished = Promise.withResolvers<void>();
      active.add(finished.promise);
      return handle(request, () => {
        active.delete(finished.promise);
        finished.resolve();
      });
    },
    dispose() {
      disposal ??= (async () => {
        lifetime.abort();
        await Promise.allSettled(active);
        if (readiness) await readiness.catch(() => undefined);
        for (const contribution of contributions.toReversed()) {
          try {
            await contribution.dispose?.();
          } catch (error) {
            report(error, "shutdown");
          }
        }
      })();
      return disposal;
    },
  };
}

function matches(route: FetchContribution, pathname: string): boolean {
  return pathname === route.path || Boolean(route.descendants && pathname.startsWith(`${route.path}/`));
}

function finalize(request: Request, response: Response, effects: readonly ResponseEffect[]): Response {
  const headers = new Headers(response.headers);
  for (const effect of effects) {
    if (effect.kind === "cookie") headers.append("Set-Cookie", effect.value);
    else {
      if (effect.name.toLowerCase() === "set-cookie") throw new Error("Cookies require a cookie effect");
      if (effect.mode === "append") headers.append(effect.name, effect.value);
      else headers.set(effect.name, effect.value);
    }
  }
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(request.method === "HEAD" ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function retainRequest(
  response: Response,
  signal: AbortSignal,
  dispose: () => Promise<void>,
  reportError: (error: unknown) => void,
): Promise<Response> {
  if (!response.body) {
    await dispose();
    return response;
  }
  const reader = response.body.getReader();
  let closed = false;
  let abort: (() => void) | undefined;
  let termination: Promise<void> | undefined;

  function finish(cancel: boolean, reason?: unknown): Promise<void> {
    if (termination) return termination;
    closed = true;
    if (abort) signal.removeEventListener("abort", abort);
    termination = Promise.resolve().then(async () => {
      try {
        if (cancel) await reader.cancel(reason);
      } finally {
        try {
          reader.releaseLock();
        } finally {
          await dispose();
        }
      }
    });
    return termination;
  }

  const body = new ReadableStream<Uint8Array>(
    {
      start(controller) {
        abort = () => {
          if (closed) return;
          const reason = new DOMException("Request aborted", "AbortError");
          controller.error(reason);
          void finish(true, reason).catch(reportError);
        };
        signal.addEventListener("abort", abort, { once: true });
        if (signal.aborted) abort();
      },
      async pull(controller) {
        if (closed) return;
        try {
          const result = await reader.read();
          if (closed) return;
          if (result.done) {
            await finish(false);
            controller.close();
          } else controller.enqueue(result.value);
        } catch (error) {
          if (closed) return;
          await finish(true, error);
          controller.error(error);
        }
      },
      cancel(reason) {
        return finish(true, reason);
      },
    },
    { highWaterMark: 0 },
  );
  return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
}
