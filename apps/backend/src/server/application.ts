import type {
  Application,
  ApplicationOptions,
  AuthHttpPublicationAbandonment,
  AuthHttpPublicationCause,
  AuthHttpPublicationEnrollment,
  AuthHttpPublicationHandle,
  AuthHttpPublicationProducer,
  AuthHttpPublicationTerminal,
  AuthHttpSettlementFailure,
  FetchContribution,
  OnboardingHttpPublicationEnrollment,
  OnboardingHttpPublicationHandle,
  OnboardingHttpPublicationProducer,
  OnboardingHttpPublicationRead,
  OnboardingHttpPublicationResult,
} from "@homarr/contracts/contribution";
import { dispatchPhases } from "@homarr/contracts/contribution";
import type { OnboardingRequestCarrier, Principal, RequestContext, ResponseEffect } from "@homarr/contracts/request";

interface ApplicationOnboardingRoot {
  readonly lifetime: AbortSignal;
  readonly requests: WeakSet<ApplicationOnboardingContextRegistration>;
}

interface ApplicationOnboardingContextRegistration {
  readonly root: ApplicationOnboardingRoot;
  readonly lifetime: AbortSignal;
  readonly request: Request;
  readonly requestSignal: AbortSignal;
  readonly signal: AbortSignal;
  readonly requestId: string;
  readonly onDispose: RequestContext["onDispose"];
  readonly carrier: OnboardingRequestCarrier;
  retired: boolean;
  disposalStarted: boolean;
}

const applicationOnboardingContexts = new WeakMap<RequestContext, ApplicationOnboardingContextRegistration>();

export function assertApplicationOnboardingRequestContext(
  context: RequestContext,
  carrier: NonNullable<RequestContext["onboardingRequest"]>,
): void {
  const registration = applicationOnboardingContexts.get(context);
  if (
    !registration ||
    registration.retired ||
    registration.disposalStarted ||
    !registration.root.requests.has(registration) ||
    registration.root.lifetime !== registration.lifetime ||
    registration.lifetime.aborted ||
    registration.carrier !== carrier ||
    context.onboardingRequest !== carrier ||
    context.request !== registration.request ||
    context.request.signal !== registration.requestSignal ||
    context.signal !== registration.signal ||
    context.requestId !== registration.requestId ||
    context.onDispose !== registration.onDispose ||
    registration.requestSignal.aborted ||
    registration.signal.aborted
  )
    throw new Error("Application onboarding request context is unavailable");
}

type PrivatePublicationGuard = Parameters<RequestContext["onPrivateResponsePublication"]>[0];
type PublicationFailure = { readonly kind: "none" } | { readonly kind: "failed"; readonly error: unknown };
type ResponseSource =
  | { readonly kind: "generic" }
  | { readonly kind: "auth-http"; readonly context: RequestContext; readonly producer: AuthHttpPublicationProducer }
  | {
      readonly kind: "onboarding-http";
      readonly context: RequestContext;
      readonly producer: OnboardingHttpPublicationProducer;
    };

interface OnboardingResponsePublication {
  context: RequestContext | undefined;
  response: Response | undefined;
  producer: OnboardingHttpPublicationProducer | undefined;
  handle: OnboardingHttpPublicationHandle | undefined;
  initial: OnboardingHttpPublicationRead | undefined;
  finalized: Response | undefined;
  head: string | undefined;
  terminal: Promise<OnboardingHttpPublicationResult> | undefined;
  settlement:
    | { readonly kind: "unstarted" }
    | { readonly kind: "pending" }
    | { readonly kind: "fulfilled"; readonly result: OnboardingHttpPublicationResult }
    | { readonly kind: "rejected"; readonly error: unknown };
}

function assertOnboardingOwnData(value: object, keys: readonly string[]): void {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getOwnPropertySymbols(value).length !== 0
  )
    throw new Error("Onboarding publication configuration is unavailable");
  const names = Object.getOwnPropertyNames(value);
  if (names.length !== keys.length || names.some((name) => !keys.includes(name)))
    throw new Error("Onboarding publication configuration is unavailable");
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) throw new Error("Onboarding publication requires own data");
  }
}

function onboardingResponseHead(response: Response, headers: Headers = response.headers): string {
  const fields: [string, string][] = [];
  let size = 0;
  headers.forEach((value, key) => {
    size += key.length + value.length;
    if (size > 65_536) throw new Error("Onboarding response head is unavailable");
    fields.push([key, value]);
  });
  return JSON.stringify({ status: response.status, statusText: response.statusText, fields });
}
type RetainedPublication =
  | { readonly kind: "generic" }
  | {
      readonly kind: "auth-http";
      assertCurrent(): void;
      finish(terminal: AuthHttpPublicationTerminal): void;
    };
type RetentionFinish =
  | { readonly kind: "cancel"; readonly cause: AuthHttpPublicationCause }
  | { readonly kind: "eof"; readonly controller: ReadableStreamDefaultController<Uint8Array> };

function publicationReason(cause: AuthHttpPublicationCause): unknown {
  if (cause.kind === "error") return cause.error;
  return cause.reason;
}

function abandonedPublication(
  cause: AuthHttpPublicationCause,
  cancellation: PublicationFailure,
  failures: readonly AuthHttpSettlementFailure[],
): AuthHttpPublicationAbandonment {
  if (cancellation.kind === "failed") {
    return { kind: "cancel-failed", cause, cancellationError: cancellation.error, otherFailures: [...failures] };
  }
  const [first, ...rest] = failures;
  if (first) return { kind: "settlement-failed", cause, failures: [first, ...rest] };
  return { kind: "abandoned", cause };
}

function publicationSettlementError(terminal: AuthHttpPublicationTerminal): AggregateError | undefined {
  if (terminal.kind !== "cancel-failed" && terminal.kind !== "settlement-failed") return undefined;
  const errors: unknown[] = [publicationReason(terminal.cause)];
  if (terminal.kind === "cancel-failed") {
    errors.push(terminal.cancellationError, ...terminal.otherFailures.map(({ error }) => error));
  } else {
    errors.push(...terminal.failures.map(({ error }) => error));
  }
  return new AggregateError(errors, "Auth HTTP response settlement failed");
}

export function createApplication(options: ApplicationOptions = {}): Application {
  const contributions = options.contributions ?? [];
  if (new Set(contributions.map(({ id }) => id)).size !== contributions.length) {
    throw new Error("Duplicate runtime contribution");
  }
  const routes = contributions
    .flatMap((contribution) => contribution.routes ?? [])
    .toSorted((left, right) => dispatchPhases.indexOf(left.phase) - dispatchPhases.indexOf(right.phase));
  const enrollment: AuthHttpPublicationEnrollment = options.authHttpPublication ?? { kind: "disabled" };
  const managedRoutes = routes.filter(({ path }) => path === "/api/auth" || path.startsWith("/api/auth/"));
  const authHttpRoutes = new Set<FetchContribution>();
  let authHttpProducer: AuthHttpPublicationProducer | undefined;
  if (enrollment.kind === "enrolled") {
    const paths = new Set([
      "/api/auth/providers",
      "/api/auth/csrf",
      "/api/auth/signin",
      "/api/auth/callback/credentials",
      "/api/auth/callback/ldap",
      "/api/auth/signin/oidc",
      "/api/auth/callback/oidc",
      "/api/auth/session",
      "/api/auth/signout",
    ]);
    if (
      !Array.isArray(enrollment.routes) ||
      enrollment.routes.length !== paths.size ||
      managedRoutes.length !== paths.size ||
      !enrollment.producer ||
      typeof enrollment.producer.claimResponsePublication !== "function" ||
      typeof enrollment.producer.finishUnclaimedResponsePublication !== "function"
    ) {
      throw new Error("Auth HTTP publication enrollment is unavailable");
    }
    let handler: FetchContribution["handle"] | undefined;
    const enrolledRoutes: readonly FetchContribution[] = enrollment.routes;
    for (const route of enrolledRoutes) {
      if (
        !paths.delete(route.path) ||
        route.phase !== "auth" ||
        route.descendants !== false ||
        route.access.kind !== "public" ||
        typeof route.handle !== "function" ||
        (handler !== undefined && route.handle !== handler) ||
        routes.filter((candidate) => candidate === route).length !== 1
      ) {
        throw new Error("Auth HTTP publication requires its exact controller routes");
      }
      handler = route.handle;
      Object.freeze(route.access);
      authHttpRoutes.add(Object.freeze(route));
    }
    authHttpProducer = enrollment.producer;
  } else if (enrollment.kind !== "disabled" || managedRoutes.length !== 0) {
    throw new Error("Auth HTTP routes require publication enrollment");
  }
  const onboardingOption = Object.getOwnPropertyDescriptor(options, "onboardingPublication");
  if ((onboardingOption && !("value" in onboardingOption)) || (!onboardingOption && "onboardingPublication" in options))
    throw new Error("Onboarding publication requires own configuration");
  const onboardingEnrollment: OnboardingHttpPublicationEnrollment = options.onboardingPublication ?? {
    kind: "disabled",
  };
  const onboardingPaths = new Set([
    "/api/onboarding/claim",
    "/rpc/onboard/nextStep",
    "/rpc/user/initUser",
    "/rpc/group/createInitialExternalGroup",
  ]);
  const onboardingRoutes = new Map<string, FetchContribution>();
  const onboardingMethods = new Set<string>();
  let onboardingProducer: OnboardingHttpPublicationProducer | undefined;
  const managedOnboardingRoutes = routes.filter((route) => onboardingPaths.has(route.path));
  const kindDescriptor = Object.getOwnPropertyDescriptor(onboardingEnrollment, "kind");
  if (!kindDescriptor || !("value" in kindDescriptor)) throw new Error("Onboarding publication kind is unavailable");
  if (onboardingEnrollment.kind === "enrolled") {
    assertOnboardingOwnData(onboardingEnrollment, ["kind", "routes", "endpoints", "producer"]);
    const expected = new Set([
      "GET /api/onboarding/claim",
      "POST /api/onboarding/claim",
      "POST /rpc/onboard/nextStep",
      "POST /rpc/user/initUser",
      "POST /rpc/group/createInitialExternalGroup",
    ]);
    if (
      !Array.isArray(onboardingEnrollment.routes) ||
      !Object.isFrozen(onboardingEnrollment.routes) ||
      onboardingEnrollment.routes.length !== 4 ||
      managedOnboardingRoutes.length !== 4 ||
      !Array.isArray(onboardingEnrollment.endpoints) ||
      !Object.isFrozen(onboardingEnrollment.endpoints) ||
      onboardingEnrollment.endpoints.length !== 5 ||
      !onboardingEnrollment.producer
    )
      throw new Error("Onboarding publication enrollment is unavailable");
    assertOnboardingOwnData(onboardingEnrollment.producer, ["claim", "abandonAsync"]);
    if (
      !Object.isFrozen(onboardingEnrollment.producer) ||
      typeof onboardingEnrollment.producer.claim !== "function" ||
      typeof onboardingEnrollment.producer.abandonAsync !== "function"
    )
      throw new Error("Onboarding publication producer is unavailable");
    for (let index = 0; index < onboardingEnrollment.routes.length; index++) {
      const descriptor = Object.getOwnPropertyDescriptor(onboardingEnrollment.routes, String(index));
      if (!descriptor || !("value" in descriptor)) throw new Error("Onboarding route configuration is unavailable");
      const route = onboardingEnrollment.routes[index];
      if (!route) throw new Error("Onboarding route is unavailable");
      assertOnboardingOwnData(route, ["phase", "path", "descendants", "access", "handle"]);
      assertOnboardingOwnData(route.access, ["kind"]);
      let phase: FetchContribution["phase"] = "rpc";
      if (route.path === "/api/onboarding/claim") phase = "api";
      if (
        !Object.isFrozen(route) ||
        !onboardingPaths.has(route.path) ||
        onboardingRoutes.has(route.path) ||
        route.phase !== phase ||
        route.descendants !== false ||
        route.access.kind !== "public" ||
        typeof route.handle !== "function" ||
        routes.filter((candidate) => candidate === route).length !== 1
      )
        throw new Error("Onboarding publication requires its exact controller routes");
      Object.freeze(route.access);
      onboardingRoutes.set(route.path, route);
    }
    for (let index = 0; index < onboardingEnrollment.endpoints.length; index++) {
      const descriptor = Object.getOwnPropertyDescriptor(onboardingEnrollment.endpoints, String(index));
      if (!descriptor || !("value" in descriptor)) throw new Error("Onboarding endpoint configuration is unavailable");
      const endpoint = onboardingEnrollment.endpoints[index];
      if (!endpoint) throw new Error("Onboarding endpoint is unavailable");
      assertOnboardingOwnData(endpoint, ["method", "path"]);
      const key = `${endpoint.method} ${endpoint.path}`;
      if (!Object.isFrozen(endpoint) || !expected.delete(key) || !onboardingRoutes.has(endpoint.path))
        throw new Error("Onboarding publication method membership is unavailable");
      onboardingMethods.add(key);
    }
    if (expected.size !== 0 || onboardingRoutes.size !== 4)
      throw new Error("Onboarding publication membership is incomplete");
    for (const route of routes) {
      if (onboardingRoutes.get(route.path) === route) continue;
      if ([...onboardingPaths].some((path) => matches(route, path))) {
        const namespaceFallback =
          route.descendants === true &&
          route.access.kind === "public" &&
          ((route.path === "/rpc" && route.phase === "rpc") ||
            ((route.path === "/api" || route.path === "/rpc") && route.phase === "asset"));
        if (!namespaceFallback) throw new Error("Onboarding publication routes have a competing handler");
      }
    }
    onboardingProducer = onboardingEnrollment.producer;
  } else {
    assertOnboardingOwnData(onboardingEnrollment, ["kind"]);
    if (onboardingEnrollment.kind !== "disabled" || managedOnboardingRoutes.length !== 0)
      throw new Error("Onboarding routes require publication enrollment");
  }
  const lifetime = new AbortController();
  const onboardingRoot: ApplicationOnboardingRoot = Object.freeze({
    lifetime: lifetime.signal,
    requests: new WeakSet<ApplicationOnboardingContextRegistration>(),
  });
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
    let disposalStarted = false;
    let onboardingRequest: OnboardingRequestCarrier | undefined;
    let onboardingRegistration: ApplicationOnboardingContextRegistration | undefined;
    let onboardingContext: RequestContext | undefined;
    let onboardingRetirement: Promise<void> | undefined;
    let ownedResponse: Response | undefined;
    let principal: Principal | undefined;
    let publicationGuard: PrivatePublicationGuard | undefined;
    let responseStarted = false;
    let retainedTermination: Promise<void> | undefined;
    let retainedCancellation: ((cause: AuthHttpPublicationCause) => Promise<void>) | undefined;
    let onboardingPublication: OnboardingResponsePublication | undefined;
    let authPublication:
      | {
          readonly context: RequestContext;
          readonly response: Response;
          readonly producer: AuthHttpPublicationProducer;
          handle: AuthHttpPublicationHandle | undefined;
          validated: boolean;
          terminal: AuthHttpPublicationTerminal | undefined;
        }
      | undefined;
    let cancellationFailure: PublicationFailure = { kind: "none" };
    const settlementFailures: AuthHttpSettlementFailure[] = [];

    function readOnboardingPublication(): OnboardingHttpPublicationRead {
      const publication = onboardingPublication;
      if (!publication?.handle || publication.terminal) throw new Error("Onboarding publication is unavailable");
      signal.throwIfAborted();
      request.signal.throwIfAborted();
      const observed = publication.handle.read();
      const initial = publication.initial;
      if (
        initial &&
        (observed.sourceOutcome !== initial.sourceOutcome ||
          observed.body.length !== initial.body.length ||
          observed.body.some((byte, index) => byte !== initial.body[index]))
      )
        throw new Error("Onboarding publication cache changed");
      if (publication.finalized && onboardingResponseHead(publication.finalized) !== publication.head)
        throw new Error("Onboarding final response head changed");
      signal.throwIfAborted();
      return observed;
    }

    function settleOnboardingPublication(
      decision: { readonly kind: "published" } | { readonly kind: "abandoned"; readonly cause: unknown },
    ): Promise<OnboardingHttpPublicationResult> {
      const publication = onboardingPublication;
      if (!publication) throw new Error("Onboarding publication is unavailable");
      if (publication.terminal) return publication.terminal;
      const completion = Promise.withResolvers<OnboardingHttpPublicationResult>();
      publication.terminal = completion.promise;
      publication.settlement = { kind: "pending" };
      void completion.promise.catch(() => undefined);
      const task = Promise.resolve().then(async () => {
        let underlying: Promise<OnboardingHttpPublicationResult>;
        if (decision.kind === "published") {
          if (!publication.handle) throw new Error("Unclaimed onboarding response cannot be published");
          try {
            underlying = publication.handle.finishAsync();
          } catch (error: unknown) {
            underlying = publication.handle.abandonAsync(error);
          }
        } else if (publication.handle) underlying = publication.handle.abandonAsync(decision.cause);
        else {
          const producer = publication.producer;
          const context = publication.context;
          const response = publication.response;
          if (!producer || !context || !response) throw new Error("Unclaimed onboarding association is unavailable");
          underlying = producer.abandonAsync(context, response, decision.cause);
        }
        return await underlying;
      });
      const forwarding = task.then(
        (result) => {
          publication.settlement = { kind: "fulfilled", result };
          completion.resolve(result);
        },
        (error: unknown) => {
          publication.settlement = { kind: "rejected", error };
          completion.reject(error);
        },
      );
      void forwarding.catch((error: unknown) => {
        publication.settlement = { kind: "rejected", error };
        completion.reject(error);
      });
      return completion.promise;
    }

    function reportOnboardingResult(result: OnboardingHttpPublicationResult): void {
      if (result.kind === "abandoned") report(result.cause, requestId);
      if (result.cleanup === "failed" && result.kind !== "abandoned")
        report(new Error("Onboarding source cleanup failed"), requestId);
    }

    function assertAuthPublication(): void {
      const publication = authPublication;
      if (!publication || !publication.validated || !publication.handle || publication.terminal) {
        throw new Error("Auth HTTP publication is unavailable");
      }
      publication.handle.assertCurrent();
      signal.throwIfAborted();
    }

    function finishAuthPublication(terminal: AuthHttpPublicationTerminal): void {
      const publication = authPublication;
      if (!publication) throw new Error("Auth HTTP publication is unavailable");
      if (publication.terminal) {
        if (publication.terminal !== terminal) throw new Error("Auth HTTP publication already finished");
        return;
      }
      if (publication.validated && publication.handle) {
        publication.handle.finish(terminal);
      } else {
        if (terminal.kind === "published") throw new Error("Unclaimed Auth HTTP response cannot be published");
        publication.producer.finishUnclaimedResponsePublication(publication.context, publication.response, terminal);
      }
      publication.terminal = terminal;
    }

    function onDispose(dispose: () => void | Promise<void>): void {
      if (disposalStarted) throw new Error("Request disposal already started");
      disposers.push(dispose);
    }

    function retireOnboardingRequestAsync(): Promise<void> {
      if (onboardingRetirement) return onboardingRetirement;
      const carrier = onboardingRequest;
      if (!carrier) throw new Error("Application onboarding request is unavailable");
      if (onboardingRegistration) onboardingRegistration.retired = true;
      const completion = Promise.withResolvers<void>();
      onboardingRetirement = completion.promise;
      void completion.promise.catch(() => undefined);
      try {
        const underlying = carrier.disposeAsync();
        void underlying.then(completion.resolve, completion.reject);
      } catch (error) {
        completion.reject(error);
      }
      return completion.promise;
    }

    function onPrivateResponsePublication(guard: PrivatePublicationGuard): void {
      if (
        disposalStarted ||
        responseStarted ||
        principal?.kind !== "authenticated" ||
        publicationGuard !== undefined ||
        !(guard.signal instanceof AbortSignal) ||
        typeof guard.assertCurrentAsync !== "function"
      ) {
        throw new Error("Private response publication is unavailable");
      }
      guard.signal.throwIfAborted();
      publicationGuard = Object.freeze({ signal: guard.signal, assertCurrentAsync: guard.assertCurrentAsync });
    }

    async function assertPrivatePublication(): Promise<void> {
      signal.throwIfAborted();
      if (publicationGuard) {
        publicationGuard.signal.throwIfAborted();
        await publicationGuard.assertCurrentAsync();
        publicationGuard.signal.throwIfAborted();
      }
      signal.throwIfAborted();
    }

    async function discardResponse(
      cause: AuthHttpPublicationCause = { kind: "cancel", reason: undefined },
    ): Promise<void> {
      const response = ownedResponse;
      ownedResponse = undefined;
      const failures: unknown[] = [];
      try {
        if (retainedCancellation) {
          await retainedCancellation(cause);
        } else if (authPublication && (response?.bodyUsed || response?.body?.locked)) {
          const error = new Error("Auth HTTP response body is not owned");
          settlementFailures.push({ stage: "release-lock", error });
          throw error;
        } else {
          try {
            await response?.body?.cancel(publicationReason(cause));
          } catch (error) {
            cancellationFailure = { kind: "failed", error };
            throw error;
          }
        }
      } catch (error) {
        failures.push(error);
      }
      if (retainedTermination) {
        try {
          await retainedTermination;
        } catch (error) {
          failures.push(error);
        }
      }
      if (failures.length === 1) throw failures[0];
      if (failures.length > 1) throw new AggregateError(failures, "Response cancellation and settlement failed");
    }

    function disposeRequest(): Promise<void> {
      if (cleanup) return cleanup;
      if (!onboardingPublication) {
        disposalStarted = true;
        if (onboardingRegistration) {
          onboardingRegistration.retired = true;
          onboardingRegistration.disposalStarted = true;
        }
      }
      const completion = Promise.withResolvers<void>();
      cleanup = completion.promise;
      void Promise.resolve()
        .then(async () => {
          if (onboardingPublication) {
            if (!onboardingPublication.terminal)
              throw new Error("Onboarding cleanup requires actual terminal settlement");
            try {
              await onboardingPublication.terminal;
            } catch (error: unknown) {
              report(error, requestId);
            }
            disposalStarted = true;
            if (onboardingRegistration) {
              onboardingRegistration.retired = true;
              onboardingRegistration.disposalStarted = true;
            }
          }
          for (const dispose of disposers.toReversed()) {
            try {
              await dispose();
            } catch (error) {
              report(error, requestId);
            }
          }
          memo.clear();
          if (onboardingContext) applicationOnboardingContexts.delete(onboardingContext);
          if (onboardingRegistration) onboardingRoot.requests.delete(onboardingRegistration);
          if (onboardingPublication) {
            onboardingPublication.handle = undefined;
            onboardingPublication.context = undefined;
            onboardingPublication.response = undefined;
            onboardingPublication.producer = undefined;
            onboardingPublication.initial = undefined;
            onboardingPublication.finalized = undefined;
            onboardingPublication.head = undefined;
          }
          complete();
        })
        .then(completion.resolve, completion.reject);
      return cleanup;
    }

    async function respondOnboarding(
      response: Response,
      suppliedEffects: readonly ResponseEffect[],
      source: Extract<ResponseSource, { kind: "onboarding-http" }>,
    ): Promise<Response> {
      if (onboardingPublication) throw new Error("Onboarding response already selected");
      const publication: OnboardingResponsePublication = {
        context: source.context,
        response,
        producer: source.producer,
        handle: undefined,
        initial: undefined,
        finalized: undefined,
        head: undefined,
        terminal: undefined,
        settlement: { kind: "unstarted" },
      };
      onboardingPublication = publication;
      ownedResponse = response;
      publication.handle = source.producer.claim(source.context, response);
      assertOnboardingOwnData(publication.handle, ["read", "finishAsync", "abandonAsync"]);
      if (
        typeof publication.handle.read !== "function" ||
        typeof publication.handle.finishAsync !== "function" ||
        typeof publication.handle.abandonAsync !== "function"
      )
        throw new Error("Onboarding publication handle is unavailable");
      publication.context = undefined;
      publication.response = undefined;
      publication.producer = undefined;
      publication.initial = readOnboardingPublication();
      if (suppliedEffects.length !== 0 || response.bodyUsed || response.body?.locked)
        throw new Error("Onboarding response effects or body are not owned");
      if (request.method !== "GET" && request.method !== "POST")
        throw new Error("Onboarding response method is unavailable");
      responseStarted = true;
      const finalized = finalize(request, response, []);
      const expectedHeaders = new Headers(response.headers);
      expectedHeaders.set("Cache-Control", "no-store");
      expectedHeaders.set("X-Content-Type-Options", "nosniff");
      const expectedHead = onboardingResponseHead(response, expectedHeaders);
      if (onboardingResponseHead(finalized) !== expectedHead)
        throw new Error("Onboarding finalization changed the owned response");
      publication.finalized = finalized;
      publication.head = expectedHead;
      if (!finalized.body) {
        if (publication.initial.body.length !== 0 || response.body !== null)
          throw new Error("Onboarding bodyless response does not match its cache");
        const completion = Promise.withResolvers<void>();
        retainedTermination = completion.promise;
        void completion.promise.catch(() => undefined);
        let cancellation: PublicationFailure = { kind: "none" };
        const sourcePrimary = publication.initial.primary;
        let task: Promise<void> | undefined;
        const startSettlement = (): Promise<void> => {
          if (task) return completion.promise;
          task = Promise.resolve().then(async () => {
            const failures: unknown[] = [];
            try {
              let result: OnboardingHttpPublicationResult;
              if (cancellation.kind === "failed")
                result = await settleOnboardingPublication({ kind: "abandoned", cause: cancellation.error });
              else result = await settleOnboardingPublication({ kind: "published" });
              reportOnboardingResult(result);
            } catch (error: unknown) {
              failures.push(error);
            }
            try {
              signal.removeEventListener("abort", abort);
            } catch (error: unknown) {
              failures.push(error);
            }
            try {
              await disposeRequest();
            } catch (error: unknown) {
              failures.push(error);
            }
            const errors: unknown[] = [];
            if (sourcePrimary.kind === "failed" && failures.length > 1) errors.push(sourcePrimary.error);
            for (const error of failures)
              if (!errors.some((existing) => Object.is(existing, error))) errors.push(error);
            if (errors.length === 1) throw errors[0];
            if (errors.length > 1)
              throw new AggregateError(errors, "Onboarding bodyless settlement failed", { cause: errors[0] });
          });
          const forwarding = task.then(completion.resolve, completion.reject);
          void forwarding.catch(completion.reject);
          return completion.promise;
        };
        retainedCancellation = (cause) => {
          if (cancellation.kind === "none") cancellation = { kind: "failed", error: publicationReason(cause) };
          return startSettlement();
        };
        const abort = () => {
          if (cancellation.kind === "none") cancellation = { kind: "failed", error: signal.reason };
          void startSettlement().catch((error: unknown) => report(error, requestId));
        };
        signal.addEventListener("abort", abort, { once: true });
        if (signal.aborted) abort();
        try {
          readOnboardingPublication();
        } catch (error: unknown) {
          if (cancellation.kind === "none") cancellation = { kind: "failed", error };
          void startSettlement().catch((cause: unknown) => report(cause, requestId));
          throw error;
        }
        void startSettlement().catch((error: unknown) => report(error, requestId));
        ownedResponse = undefined;
        return finalized;
      }
      return retainOnboardingResponse(finalized, publication);
    }

    function retainOnboardingResponse(response: Response, publication: OnboardingResponsePublication): Response {
      const body = response.body;
      if (!body || !publication.initial) throw new Error("Onboarding finite body is unavailable");
      const expected = publication.initial.body;
      const sourcePrimary = publication.initial.primary;
      const readerClosed = Promise.withResolvers<void>();
      void readerClosed.promise.catch(() => undefined);
      let reader: ReadableStreamDefaultReader<Uint8Array>;
      try {
        reader = body.getReader();
        const underlying = reader.closed;
        const forwarding = underlying.then(readerClosed.resolve, readerClosed.reject);
        void forwarding.catch(readerClosed.reject);
      } catch (error: unknown) {
        readerClosed.reject(error);
        throw error;
      }
      type OnboardingReadResult = Awaited<ReturnType<typeof reader.read>>;
      let pendingRead: Promise<OnboardingReadResult> | undefined;
      let cancellation: Promise<void> | undefined;
      let termination: Promise<void> | undefined;
      let cancellationCause: PublicationFailure = { kind: "none" };
      let closed = false;
      let offset = 0;
      let output: ReadableStreamDefaultController<Uint8Array> | undefined;
      let abort: (() => void) | undefined;
      const failures: unknown[] = [];
      const retainFailure = (error: unknown) => {
        if (!failures.some((existing) => Object.is(existing, error))) failures.push(error);
      };
      const cancelReader = (reason: unknown): Promise<void> => {
        if (cancellation) return cancellation;
        const completion = Promise.withResolvers<void>();
        cancellation = completion.promise;
        void completion.promise.catch(() => undefined);
        try {
          const underlying = reader.cancel(reason);
          const forwarding = underlying.then(completion.resolve, completion.reject);
          void forwarding.catch(completion.reject);
        } catch (error: unknown) {
          completion.reject(error);
        }
        return completion.promise;
      };
      const finish = (
        mode: { readonly kind: "eof" } | { readonly kind: "cancel"; readonly cause: unknown },
      ): Promise<void> => {
        if (mode.kind === "cancel" && cancellationCause.kind === "none")
          cancellationCause = { kind: "failed", error: mode.cause };
        if (termination) return termination;
        closed = true;
        const completion = Promise.withResolvers<void>();
        termination = completion.promise;
        retainedTermination = completion.promise;
        void completion.promise.catch(() => undefined);
        const settle = async () => {
          let terminalFailure: PublicationFailure = { kind: "none" };
          if (mode.kind === "cancel") {
            try {
              await cancelReader(mode.cause);
            } catch (error: unknown) {
              retainFailure(error);
            }
          }
          const pending: Promise<unknown>[] = [readerClosed.promise];
          if (pendingRead) pending.push(pendingRead);
          if (cancellation) pending.push(cancellation);
          const settled = await Promise.allSettled(pending);
          for (const outcome of settled) if (outcome.status === "rejected") retainFailure(outcome.reason);
          const released = Promise.withResolvers<void>();
          void released.promise.catch(() => undefined);
          try {
            reader.releaseLock();
            released.resolve();
          } catch (error: unknown) {
            released.reject(error);
          }
          try {
            await released.promise;
          } catch (error: unknown) {
            retainFailure(error);
          }
          if (abort) {
            try {
              signal.removeEventListener("abort", abort);
            } catch (error: unknown) {
              retainFailure(error);
            }
          }
          let decision: { readonly kind: "published" } | { readonly kind: "abandoned"; readonly cause: unknown };
          if (cancellationCause.kind === "failed") decision = { kind: "abandoned", cause: cancellationCause.error };
          else if (failures.length > 0) decision = { kind: "abandoned", cause: failures[0] };
          else {
            try {
              if (offset !== expected.length || !output)
                throw new Error("Onboarding response EOF does not match its cache");
              readOnboardingPublication();
              output.close();
              decision = { kind: "published" };
            } catch (error: unknown) {
              retainFailure(error);
              decision = { kind: "abandoned", cause: error };
            }
          }
          if (decision.kind === "abandoned") {
            try {
              output?.error(decision.cause);
            } catch (error: unknown) {
              retainFailure(error);
            }
          }
          try {
            reportOnboardingResult(await settleOnboardingPublication(decision));
          } catch (error: unknown) {
            terminalFailure = { kind: "failed", error };
          }
          try {
            await disposeRequest();
          } catch (error: unknown) {
            retainFailure(error);
          }
          const errors: unknown[] = [];
          if (sourcePrimary.kind === "failed" && failures.length > 0) errors.push(sourcePrimary.error);
          for (const error of failures) if (!errors.some((existing) => Object.is(existing, error))) errors.push(error);
          if (terminalFailure.kind === "failed") {
            const error = terminalFailure.error;
            if (!errors.some((existing) => Object.is(existing, error))) errors.push(error);
          }
          if (errors.length === 1) throw errors[0];
          if (errors.length > 1)
            throw new AggregateError(errors, "Onboarding response settlement failed", { cause: errors[0] });
        };
        const task = Promise.resolve().then(settle);
        const forwarding = task.then(completion.resolve, completion.reject);
        void forwarding.catch(completion.reject);
        return completion.promise;
      };
      retainedCancellation = (cause) => finish({ kind: "cancel", cause: publicationReason(cause) });
      const stream = new ReadableStream<Uint8Array>(
        {
          start(controller) {
            output = controller;
            abort = () => {
              if (closed) return;
              const cause = signal.reason;
              controller.error(cause);
              void finish({ kind: "cancel", cause }).catch((error: unknown) => report(error, requestId));
            };
            try {
              signal.addEventListener("abort", abort, { once: true });
              if (signal.aborted) abort();
            } catch (error: unknown) {
              retainFailure(error);
              controller.error(error);
              void finish({ kind: "cancel", cause: error }).catch((cause: unknown) => report(cause, requestId));
            }
          },
          async pull(controller) {
            if (closed) return;
            const read = Promise.withResolvers<OnboardingReadResult>();
            pendingRead = read.promise;
            void read.promise.catch(() => undefined);
            try {
              try {
                const underlying = reader.read();
                const forwarding = underlying.then(read.resolve, read.reject);
                void forwarding.catch(read.reject);
              } catch (error: unknown) {
                read.reject(error);
              }
              const result = await read.promise;
              pendingRead = undefined;
              if (closed) return;
              const observed = readOnboardingPublication();
              if (result.done) {
                if (offset !== observed.body.length)
                  throw new Error("Onboarding response ended before its owned cache");
                await finish({ kind: "eof" });
                return;
              }
              const chunk = result.value;
              if (
                !(chunk instanceof Uint8Array) ||
                offset + chunk.length > observed.body.length ||
                chunk.some((byte, index) => byte !== observed.body[offset + index])
              )
                throw new Error("Onboarding response bytes differ from the owned cache");
              const published = chunk.slice();
              readOnboardingPublication();
              offset += chunk.length;
              controller.enqueue(published);
            } catch (error: unknown) {
              pendingRead = undefined;
              if (closed) return;
              retainFailure(error);
              controller.error(error);
              await finish({ kind: "cancel", cause: error });
            }
          },
          cancel(reason: unknown) {
            return finish({ kind: "cancel", cause: reason });
          },
        },
        { highWaterMark: 0 },
      );
      const retained = new Response(stream, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
      publication.finalized = retained;
      ownedResponse = retained;
      if (closed) throw new Error("Onboarding response retention stopped before handoff");
      readOnboardingPublication();
      ownedResponse = undefined;
      return retained;
    }

    async function respond(
      response: Response,
      suppliedEffects: readonly ResponseEffect[] = effects,
      source: ResponseSource = { kind: "generic" },
    ): Promise<Response> {
      if (source.kind === "onboarding-http") return respondOnboarding(response, suppliedEffects, source);
      ownedResponse = response;
      if (onboardingRequest && response.status >= 400) await retireOnboardingRequestAsync();
      responseStarted = true;
      let retainedPublication: RetainedPublication = { kind: "generic" };
      let authLifetime: AbortSignal | undefined;
      if (source.kind === "auth-http") {
        authPublication = {
          context: source.context,
          response,
          producer: source.producer,
          handle: undefined,
          validated: false,
          terminal: undefined,
        };
        authPublication.handle = source.producer.claimResponsePublication(source.context, response);
        const handle = authPublication.handle;
        if (
          typeof handle !== "object" ||
          handle === null ||
          !(handle.lifetime instanceof AbortSignal) ||
          typeof handle.assertCurrent !== "function" ||
          typeof handle.finish !== "function"
        ) {
          throw new Error("Auth HTTP publication handle is unavailable");
        }
        authPublication.validated = true;
        assertAuthPublication();
        authLifetime = handle.lifetime;
        retainedPublication = {
          kind: "auth-http",
          assertCurrent: assertAuthPublication,
          finish: finishAuthPublication,
        };
      }
      await assertPrivatePublication();
      const finalized = finalize(request, response, suppliedEffects);
      if (request.method === "HEAD") await discardResponse();
      await assertPrivatePublication();
      let publicationSignal = signal;
      if (publicationGuard) publicationSignal = AbortSignal.any([signal, publicationGuard.signal]);
      if (authLifetime) publicationSignal = AbortSignal.any([publicationSignal, authLifetime]);
      if (retainedPublication.kind === "auth-http" && !finalized.body) {
        retainedPublication.assertCurrent();
        let boundary: "bodyless" | "head" = "bodyless";
        if (request.method === "HEAD") boundary = "head";
        retainedPublication.finish({ kind: "published", boundary });
        ownedResponse = undefined;
        void disposeRequest().catch((error) => report(error, requestId));
        return finalized;
      }
      const retained = await retainRequest(
        finalized,
        publicationSignal,
        assertPrivatePublication,
        disposeRequest,
        (error) => report(error, requestId),
        (task) => {
          retainedTermination = task;
        },
        (cancel) => {
          retainedCancellation = cancel;
        },
        retainedPublication,
      );
      ownedResponse = retained;
      if (retained.body) await assertPrivatePublication();
      if (retainedPublication.kind === "auth-http") retainedPublication.assertCurrent();
      ownedResponse = undefined;
      return retained;
    }

    try {
      onboardingRequest = options.services?.captureOnboardingRequest?.({
        request,
        requestId,
        signal,
        onDispose,
        lifetime: lifetime.signal,
      });
      if (onboardingRequest) {
        onboardingRegistration = {
          root: onboardingRoot,
          lifetime: lifetime.signal,
          request,
          requestSignal: request.signal,
          signal,
          requestId,
          onDispose,
          carrier: onboardingRequest,
          retired: false,
          disposalStarted: false,
        };
        onboardingRoot.requests.add(onboardingRegistration);
        onDispose(retireOnboardingRequestAsync);
        const abortOnboardingRequest = () => {
          void retireOnboardingRequestAsync().catch((error) => report(error, requestId));
        };
        onDispose(() => signal.removeEventListener("abort", abortOnboardingRequest));
        signal.addEventListener("abort", abortOnboardingRequest, { once: true });
        if (signal.aborted) abortOnboardingRequest();
      }
      signal.throwIfAborted();
      await ready();
      signal.throwIfAborted();
      const resolvedPrincipal = (await options.services?.resolvePrincipal?.({
        request,
        requestId,
        signal,
        onDispose,
        onboardingRequest,
      })) ?? {
        kind: "anonymous" as const,
      };
      if (
        typeof resolvedPrincipal !== "object" ||
        resolvedPrincipal === null ||
        Array.isArray(resolvedPrincipal) ||
        (resolvedPrincipal.kind !== "anonymous" && resolvedPrincipal.kind !== "authenticated") ||
        (resolvedPrincipal.kind === "authenticated" &&
          (typeof resolvedPrincipal.subject !== "string" || resolvedPrincipal.subject.length === 0))
      ) {
        throw new Error("Request principal is unavailable");
      }
      const requestPrincipal = Object.freeze(resolvedPrincipal);
      principal = requestPrincipal;
      const setup = Object.freeze({
        ...((await options.services?.resolveSetup?.({ requestId, signal })) ?? { kind: "unavailable" as const }),
      });
      const context: RequestContext = {
        request,
        requestId,
        signal,
        principal: requestPrincipal,
        setup,
        onboardingRequest,
        memoize<T>(key: symbol, read: () => Promise<T>): Promise<T> {
          if (!memo.has(key)) memo.set(key, read());
          return memo.get(key) as Promise<T>;
        },
        effect(effect) {
          signal.throwIfAborted();
          effects.push(effect);
        },
        onDispose,
        onPrivateResponsePublication,
        async authorize(requirement) {
          signal.throwIfAborted();
          if (requirement.kind === "public") return { kind: "allow" };
          if (requestPrincipal.kind === "anonymous") return { kind: "deny", status: 401 };
          return (
            (await options.services?.authorize?.(requestPrincipal, requirement, signal)) ?? {
              kind: "deny",
              status: 403,
            }
          );
        },
      };
      if (onboardingRegistration) {
        if (
          onboardingRegistration.retired ||
          onboardingRegistration.disposalStarted ||
          context.onboardingRequest !== onboardingRegistration.carrier
        )
          throw new Error("Application onboarding request context is unavailable");
        applicationOnboardingContexts.set(context, onboardingRegistration);
        onboardingContext = context;
        assertApplicationOnboardingRequestContext(context, onboardingRegistration.carrier);
      }
      const pathname = new URL(request.url).pathname;
      const selectedOnboardingRoute = onboardingRoutes.get(pathname);
      for (const route of routes) {
        if (selectedOnboardingRoute && route !== selectedOnboardingRoute) continue;
        if (!matches(route, pathname)) continue;
        const decision = await context.authorize(route.access);
        if (decision.kind === "deny") {
          if (onboardingRequest) await retireOnboardingRequestAsync();
          return await respond(Response.json({ code: "ACCESS_DENIED" }, { status: decision.status }));
        }
        const result = await route.handle(context);
        if (route === selectedOnboardingRoute && onboardingMethods.has(`${request.method} ${pathname}`)) {
          if (!onboardingProducer || result.kind !== "response")
            throw new Error("Onboarding controller output is unavailable");
          return await respond(result.response, effects, {
            kind: "onboarding-http",
            context,
            producer: onboardingProducer,
          });
        }
        if (authHttpRoutes.has(route)) {
          if (!authHttpProducer || result.kind !== "response")
            throw new Error("Auth HTTP controller output is unavailable");
          return await respond(result.response, effects, { kind: "auth-http", context, producer: authHttpProducer });
        }
        if (result.kind === "response") return await respond(result.response);
        if (onboardingRequest) {
          await retireOnboardingRequestAsync();
          return await respond(Response.json({ code: "NOT_FOUND" }, { status: 404 }));
        }
        signal.throwIfAborted();
      }
      if (/^\/(?:api|rpc|auth|streams|binary|assets)(?:\/|$)/.test(pathname)) {
        return await respond(Response.json({ code: "NOT_FOUND" }, { status: 404 }));
      }
      const response = (await options.render?.(context)) ?? new Response("Not found", { status: 404 });
      return await respond(response);
    } catch (error) {
      report(error, requestId);
      if (onboardingRequest && !onboardingPublication) {
        try {
          await retireOnboardingRequestAsync();
        } catch (retirementError) {
          if (retirementError !== error) report(retirementError, requestId);
        }
      }
      try {
        await discardResponse({ kind: "error", error });
      } catch (cancellationError) {
        report(cancellationError, requestId);
      }
      if (authPublication && !authPublication.terminal) {
        try {
          finishAuthPublication(
            abandonedPublication({ kind: "error", error }, cancellationFailure, settlementFailures),
          );
        } catch (publicationError) {
          report(publicationError, requestId);
        }
      }
      if (onboardingPublication && !onboardingPublication.terminal) {
        try {
          reportOnboardingResult(await settleOnboardingPublication({ kind: "abandoned", cause: error }));
        } catch (publicationError: unknown) {
          report(publicationError, requestId);
        }
      } else if (onboardingPublication?.terminal) {
        try {
          reportOnboardingResult(await onboardingPublication.terminal);
        } catch (publicationError: unknown) {
          report(publicationError, requestId);
        }
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
      if (disposal) return disposal;
      const shutdown = Promise.withResolvers<void>();
      disposal = shutdown.promise;
      void (async () => {
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
      })().then(shutdown.resolve, shutdown.reject);
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
  assertPublication: () => Promise<void>,
  dispose: () => Promise<void>,
  reportError: (error: unknown) => void,
  onTermination: (task: Promise<void>) => void,
  onRetention: (cancel: (cause: AuthHttpPublicationCause) => Promise<void>) => void,
  publication: RetainedPublication,
): Promise<Response> {
  if (!response.body) {
    await dispose();
    return response;
  }
  const reader = response.body.getReader();
  let readerClosed: Promise<void> | undefined;
  let closed = false;
  let abort: (() => void) | undefined;
  let termination: Promise<void> | undefined;
  let pendingRead: ReturnType<typeof reader.read> | undefined;
  let pendingPublication: Promise<void> | undefined;
  let cancellationCause: AuthHttpPublicationCause | undefined;
  let terminalRecorded = false;
  const failures: AuthHttpSettlementFailure[] = [];

  function retainFailure(stage: AuthHttpSettlementFailure["stage"], error: unknown): void {
    if (!failures.some((failure) => failure.stage === stage && failure.error === error))
      failures.push({ stage, error });
  }

  function finish(mode: RetentionFinish): Promise<void> {
    if (mode.kind === "cancel" && cancellationCause === undefined) cancellationCause = mode.cause;
    if (termination) return termination;
    closed = true;
    const completion = Promise.withResolvers<void>();
    termination = completion.promise;
    void termination.catch(() => undefined);
    onTermination(termination);
    const settle = async (): Promise<void> => {
      if (abort) {
        if (publication.kind === "auth-http") {
          try {
            signal.removeEventListener("abort", abort);
          } catch (error) {
            retainFailure("publication", error);
          }
        } else signal.removeEventListener("abort", abort);
      }
      if (publication.kind === "generic") {
        try {
          if (mode.kind === "cancel") await reader.cancel(publicationReason(mode.cause));
        } finally {
          try {
            const pending: Promise<unknown>[] = [];
            if (pendingRead) pending.push(pendingRead);
            if (pendingPublication) pending.push(pendingPublication);
            if (readerClosed) pending.push(readerClosed);
            await Promise.allSettled(pending);
          } finally {
            try {
              reader.releaseLock();
            } finally {
              await dispose();
            }
          }
        }
        return;
      }
      const pending: { readonly stage: AuthHttpSettlementFailure["stage"]; readonly task: Promise<unknown> }[] = [];
      if (pendingRead) pending.push({ stage: "read", task: pendingRead });
      if (pendingPublication) pending.push({ stage: "publication", task: pendingPublication });
      if (readerClosed) pending.push({ stage: "reader-closed", task: readerClosed });
      let cancellation: PublicationFailure = { kind: "none" };
      if (mode.kind === "cancel") {
        try {
          await reader.cancel(publicationReason(mode.cause));
        } catch (error) {
          cancellation = { kind: "failed", error };
        }
      }
      await Promise.all(
        pending.map(async ({ stage, task }) => {
          try {
            await task;
          } catch (error) {
            retainFailure(stage, error);
          }
        }),
      );
      try {
        reader.releaseLock();
      } catch (error) {
        retainFailure("release-lock", error);
      }
      let terminal: AuthHttpPublicationTerminal;
      if (mode.kind === "cancel") {
        terminal = abandonedPublication(mode.cause, cancellation, failures);
      } else {
        const [first] = failures;
        if (cancellationCause) {
          terminal = abandonedPublication(cancellationCause, cancellation, failures);
          mode.controller.error(publicationReason(cancellationCause));
        } else if (first) {
          terminal = abandonedPublication({ kind: "error", error: first.error }, cancellation, failures);
          mode.controller.error(first.error);
        } else {
          try {
            signal.throwIfAborted();
            publication.assertCurrent();
            mode.controller.close();
            terminal = { kind: "published", boundary: "eof" };
          } catch (error) {
            terminal = abandonedPublication({ kind: "error", error }, cancellation, failures);
            mode.controller.error(error);
          }
        }
      }
      publication.finish(terminal);
      terminalRecorded = true;
      const error = publicationSettlementError(terminal);
      if (error) throw error;
    };
    void Promise.resolve()
      .then(settle)
      .then(
        () => {
          completion.resolve();
          if (publication.kind === "auth-http" && terminalRecorded) void dispose().catch(reportError);
        },
        (error: unknown) => {
          completion.reject(error);
          if (publication.kind === "auth-http" && terminalRecorded) void dispose().catch(reportError);
        },
      );
    return termination;
  }

  try {
    onRetention((cause) => finish({ kind: "cancel", cause }));
    readerClosed = reader.closed;
    void readerClosed.catch(() => undefined);
    const body = new ReadableStream<Uint8Array>(
      {
        start(controller) {
          abort = () => {
            if (closed) return;
            const reason = new DOMException("Request aborted", "AbortError");
            controller.error(reason);
            void finish({ kind: "cancel", cause: { kind: "cancel", reason } }).catch(reportError);
          };
          signal.addEventListener("abort", abort, { once: true });
          if (signal.aborted) abort();
        },
        async pull(controller) {
          if (closed) return;
          let stage: "read" | "publication" | "boundary" = "read";
          try {
            pendingRead = reader.read();
            const result = await pendingRead;
            pendingRead = undefined;
            if (closed) return;
            signal.throwIfAborted();
            stage = "publication";
            pendingPublication = assertPublication();
            await pendingPublication;
            pendingPublication = undefined;
            if (closed) return;
            stage = "boundary";
            signal.throwIfAborted();
            if (result.done) {
              await finish({ kind: "eof", controller });
              if (publication.kind === "generic") controller.close();
            } else {
              if (publication.kind === "auth-http") publication.assertCurrent();
              controller.enqueue(result.value);
            }
          } catch (error) {
            if (publication.kind === "auth-http" && stage !== "boundary") retainFailure(stage, error);
            pendingRead = undefined;
            pendingPublication = undefined;
            if (closed) return;
            if (publication.kind === "generic") {
              await finish({ kind: "cancel", cause: { kind: "error", error } });
              controller.error(error);
            } else {
              controller.error(error);
              await finish({ kind: "cancel", cause: { kind: "error", error } });
            }
          }
        },
        cancel(reason) {
          return finish({ kind: "cancel", cause: { kind: "cancel", reason } });
        },
      },
      { highWaterMark: 0 },
    );
    return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
  } catch (error) {
    try {
      await finish({ kind: "cancel", cause: { kind: "error", error } });
    } catch (settlementError) {
      throw new AggregateError([error, settlementError], "Response retention and settlement failed");
    }
    throw error;
  }
}
