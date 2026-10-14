import { os } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

import type {
  Application,
  AuthHttpPublicationEnrollment,
  FetchContribution,
  OnboardingHttpPublicationEnrollment,
  RuntimeContribution,
} from "@homarr/contracts/contribution";
import type { RequestContext, RequestServices } from "@homarr/contracts/request";
import { createApplication } from "../application";
import { captureHostConfiguration, hostPath } from "./configuration";
import type {
  AuthHttpController,
  MainPersistenceRuntime,
  OwnedOnboardingWireController,
  PublicHostConfiguration,
} from "./contracts";
import type { AuthenticatedRequestResources } from "./auth";
import { authenticatedRpcReadAccess } from "./authenticated-rpc";
import { getRuntimeJoinSlots } from "./join-slots";

export type ResourceHostPhase =
  | "configured"
  | "initializing"
  | "ready"
  | "unavailable"
  | "failed"
  | "draining"
  | "closed"
  | "close-failed";

interface ResourceHostPersistence<Database, Schema> {
  readonly runtime: Pick<
    MainPersistenceRuntime<Database, Schema>,
    "engine" | "phase" | "runAsync" | "checkReadinessAsync"
  >;
  readonly contribution: RuntimeContribution;
  assertCurrent(): void;
}

export function assemblePublicResourceHost<Database, Schema, Prepared>(options: {
  readonly configuration: PublicHostConfiguration;
  readonly persistence: ResourceHostPersistence<Database, Schema>;
  readonly settings: { readonly services: RequestServices };
  readonly culture: {
    readonly localeCommit: FetchContribution;
    prepareAsync(context: RequestContext): Promise<Prepared>;
    classify(request: Request): { readonly kind: "document" | "excluded" };
  };
  readonly rpc: FetchContribution;
  readonly authentication:
    | { readonly kind: "public-only" }
    | {
        readonly kind: "authenticated-read";
        readonly requests: AuthenticatedRequestResources;
        readonly rpc: readonly FetchContribution[];
        readonly fixedWrites: readonly FetchContribution[];
        readonly authHttpController: AuthHttpController;
        readonly authHttpRoutes: readonly FetchContribution[];
        readonly onboardingController: OwnedOnboardingWireController;
        readonly authHttpOwner: ResourceHostPersistence<Database, Schema> & {
          assertAuthHttpController(controller: AuthHttpController): void;
          assertOnboardingWireController(controller: OwnedOnboardingWireController): void;
        };
      };
  render(context: RequestContext, prepared: Prepared): Promise<Response>;
  reportError(error: unknown, requestId: string): void;
}) {
  const configuration = captureHostConfiguration(options.configuration);
  if (
    options.persistence.contribution.id !== "main-persistence" ||
    !options.persistence.contribution.ready ||
    !options.persistence.contribution.dispose ||
    options.persistence.contribution.routes?.length ||
    options.persistence.runtime.engine !== "sqlite" ||
    options.persistence.runtime.phase !== "ready"
  ) {
    throw new Error("Host requires its own ready main persistence contribution");
  }
  options.persistence.assertCurrent();
  if (
    options.rpc.phase !== "rpc" ||
    options.rpc.path !== hostPath(configuration, "/rpc") ||
    !options.rpc.descendants ||
    options.rpc.access.kind !== "public" ||
    options.culture.localeCommit.phase !== "api" ||
    options.culture.localeCommit.path !== hostPath(configuration, "/api/preferences/locale") ||
    options.culture.localeCommit.descendants ||
    options.culture.localeCommit.access.kind !== "public"
  ) {
    throw new Error("Resource routes do not match the explicit same-listener host configuration");
  }
  let services = options.settings.services;
  let authenticatedRoutes: readonly FetchContribution[] = [];
  let fixedWriteRoutes: readonly FetchContribution[] = [];
  let authHttpRoutes: readonly FetchContribution[] = [];
  let authHttpPublication: AuthHttpPublicationEnrollment = { kind: "disabled" };
  let onboardingPublication: OnboardingHttpPublicationEnrollment = { kind: "disabled" };
  let onboardingContributions: readonly RuntimeContribution[] = [];
  if (options.authentication.kind === "authenticated-read") {
    const authentication = options.authentication;
    if (configuration.basePath !== "" || authentication.authHttpOwner !== options.persistence)
      throw new Error("Host requires its own authentication HTTP controller with an empty base path");
    authentication.authHttpOwner.assertAuthHttpController(authentication.authHttpController);
    authentication.authHttpOwner.assertOnboardingWireController(authentication.onboardingController);
    if (
      authentication.rpc.length !== authenticatedRpcReadAccess.length ||
      authenticatedRpcReadAccess.some(
        (rule) =>
          !authentication.rpc.some(
            (route) =>
              route.phase === "rpc" &&
              route.descendants === false &&
              route.path === `${hostPath(configuration, "/rpc")}/${rule.resource.replaceAll(".", "/")}` &&
              route.access.kind === "protected" &&
              route.access.action === "read" &&
              route.access.resource === rule.resource,
          ),
      )
    )
      throw new Error("Host requires exactly the authenticated read routes");
    const fixedWriteResources: readonly string[] = Object.freeze([
      "app.create",
      "board.saveUserBoardPermissions",
      "board.saveGroupBoardPermissions",
    ]);
    if (authentication.fixedWrites.length !== 0 && authentication.fixedWrites.length !== fixedWriteResources.length)
      throw new Error("Host requires zero or exactly three fixed write routes");
    const fixedPaths = new Set<string>();
    const fixedResources = new Set<string>();
    const enrolledExactPaths = new Set([
      hostPath(configuration, "/api/health"),
      hostPath(configuration, "/rpc/health"),
      options.culture.localeCommit.path,
      ...authentication.rpc.map((route) => route.path),
    ]);
    for (const route of authentication.fixedWrites) {
      if (
        route.phase !== "rpc" ||
        route.descendants !== false ||
        route.access.kind !== "protected" ||
        route.access.action !== "write" ||
        !fixedWriteResources.includes(route.access.resource) ||
        route.path !== `${hostPath(configuration, "/rpc")}/${route.access.resource.replaceAll(".", "/")}` ||
        typeof route.handle !== "function" ||
        fixedPaths.has(route.path) ||
        fixedResources.has(route.access.resource) ||
        enrolledExactPaths.has(route.path)
      )
        throw new Error("Host requires the exact protected fixed write routes without collisions");
      fixedPaths.add(route.path);
      fixedResources.add(route.access.resource);
    }
    const authHttpPaths: readonly string[] = Object.freeze([
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
      authentication.authHttpRoutes.length !== authHttpPaths.length ||
      !Object.isFrozen(authentication.authHttpRoutes)
    )
      throw new Error("Host requires exactly the frozen authentication HTTP routes");
    const otherRoutes = [
      options.rpc,
      options.culture.localeCommit,
      ...authentication.rpc,
      ...authentication.fixedWrites,
    ];
    for (const route of otherRoutes) {
      if (
        route.phase === "auth" ||
        route.path === "/api/auth" ||
        route.path.startsWith("/api/auth/") ||
        (route.descendants && authHttpPaths.some((path) => route.path === "/" || path.startsWith(`${route.path}/`)))
      )
        throw new Error("Host authentication HTTP routes cannot have competing handlers");
    }
    const otherPaths = new Set([
      hostPath(configuration, "/api/health"),
      hostPath(configuration, "/rpc/health"),
      ...otherRoutes.map((route) => route.path),
    ]);
    const authPaths = new Set<string>();
    const authObjects = new Set<FetchContribution>();
    for (const route of authentication.authHttpRoutes) {
      if (
        !Object.isFrozen(route) ||
        !Object.isFrozen(route.access) ||
        route.phase !== "auth" ||
        route.descendants !== false ||
        route.access.kind !== "public" ||
        !authHttpPaths.includes(route.path) ||
        typeof route.handle !== "function" ||
        route.handle !== authentication.authHttpController.handle ||
        authPaths.has(route.path) ||
        authObjects.has(route) ||
        otherPaths.has(route.path)
      )
        throw new Error("Host requires the exact owned authentication HTTP routes without collisions");
      authPaths.add(route.path);
      authObjects.add(route);
    }
    if (authHttpPaths.some((path) => !authPaths.has(path)))
      throw new Error("Host authentication HTTP route membership is incomplete");
    authHttpRoutes = authentication.authHttpRoutes;
    authHttpPublication = {
      kind: "enrolled",
      routes: authHttpRoutes,
      producer: authentication.authHttpController,
    };
    const onboardingController = authentication.onboardingController;
    const onboardingPaths: readonly string[] = Object.freeze([
      "/api/onboarding/claim",
      "/rpc/onboard/nextStep",
      "/rpc/user/initUser",
      "/rpc/group/createInitialExternalGroup",
    ]);
    if (
      !Object.isFrozen(onboardingController.routes) ||
      onboardingController.routes.length !== 4 ||
      !Object.isFrozen(onboardingController.endpoints) ||
      onboardingController.endpoints.length !== 5
    )
      throw new Error("Host requires exactly the frozen onboarding routes and endpoints");
    const onboardingRoutePaths = new Set<string>();
    const onboardingObjects = new Set<FetchContribution>();
    for (const route of onboardingController.routes) {
      let phase: FetchContribution["phase"] = "rpc";
      if (route.path === "/api/onboarding/claim") phase = "api";
      if (
        !Object.isFrozen(route) ||
        route.phase !== phase ||
        route.descendants !== false ||
        route.access.kind !== "public" ||
        !onboardingPaths.includes(route.path) ||
        typeof route.handle !== "function" ||
        onboardingRoutePaths.has(route.path) ||
        onboardingObjects.has(route) ||
        otherPaths.has(route.path) ||
        authPaths.has(route.path)
      )
        throw new Error("Host requires the exact owned onboarding routes without collisions");
      onboardingRoutePaths.add(route.path);
      onboardingObjects.add(route);
    }
    const onboardingEndpoints = new Set([
      "GET /api/onboarding/claim",
      "POST /api/onboarding/claim",
      "POST /rpc/onboard/nextStep",
      "POST /rpc/user/initUser",
      "POST /rpc/group/createInitialExternalGroup",
    ]);
    for (const endpoint of onboardingController.endpoints) {
      if (
        !Object.isFrozen(endpoint) ||
        !onboardingEndpoints.delete(`${endpoint.method} ${endpoint.path}`) ||
        !onboardingRoutePaths.has(endpoint.path)
      )
        throw new Error("Host requires the exact owned onboarding method membership");
    }
    if (onboardingEndpoints.size !== 0 || onboardingRoutePaths.size !== 4)
      throw new Error("Host onboarding route membership is incomplete");
    onboardingPublication = Object.freeze({
      kind: "enrolled",
      routes: onboardingController.routes,
      endpoints: onboardingController.endpoints,
      producer: onboardingController.publication,
    });
    onboardingContributions = Object.freeze([
      Object.freeze<RuntimeContribution>({
        id: "onboarding-wire",
        routes: onboardingController.routes,
        dispose: () => onboardingController.closeAsync(),
      }),
    ]);
    services = {
      captureOnboardingRequest: authentication.requests.services.captureOnboardingRequest,
      resolvePrincipal: authentication.requests.services.resolvePrincipal,
      authorize: authentication.requests.services.authorize,
      async resolveSetup(context) {
        const setup = authentication.requests.getOnboardingSetupState(context);
        if (setup !== undefined) return setup;
        return options.settings.services.resolveSetup(context);
      },
    };
    authenticatedRoutes = authentication.rpc;
    fixedWriteRoutes = authentication.fixedWrites;
  }
  let phase: ResourceHostPhase = "configured";
  let disposal: Promise<void> | undefined;
  const cleanupErrors: unknown[] = [];

  async function checkReadinessAsync(): Promise<void> {
    try {
      options.persistence.assertCurrent();
      const readiness = await options.persistence.runtime.checkReadinessAsync();
      if (!readiness.ready || readiness.engine !== "sqlite" || readiness.phase !== "ready") {
        throw new Error("Host persistence readiness SQL did not succeed");
      }
      options.persistence.assertCurrent();
      if (phase === "unavailable") phase = "ready";
    } catch (error) {
      if (phase === "ready" || phase === "unavailable") {
        phase = options.persistence.runtime.phase === "failed" ? "failed" : "unavailable";
      }
      throw error;
    }
  }

  const publicProcedure = os.$context<RequestContext>();
  const foundationRpc = {
    health: publicProcedure.handler(async ({ context }) => {
      context.signal.throwIfAborted();
      await checkReadinessAsync();
      context.signal.throwIfAborted();
      return { status: "ready" as const, scope: "public-foundation" as const };
    }),
  };
  const foundationRpcHandler = new RPCHandler(foundationRpc);
  const foundation: RuntimeContribution = {
    id: "foundation",
    routes: [
      {
        phase: "api",
        path: hostPath(configuration, "/api/health"),
        access: { kind: "public" },
        async handle(context) {
          context.signal.throwIfAborted();
          await checkReadinessAsync();
          context.signal.throwIfAborted();
          return {
            kind: "response",
            response: Response.json({ status: "ready", scope: "public-foundation" }),
          };
        },
      },
      {
        phase: "rpc",
        path: hostPath(configuration, "/rpc/health"),
        descendants: false,
        access: { kind: "public" },
        async handle(context) {
          const result = await foundationRpcHandler.handle(context.request, {
            prefix: hostPath(configuration, "/rpc"),
            context,
          });
          return result.matched ? { kind: "response", response: result.response } : { kind: "pass" };
        },
      },
    ],
  };
  const persistence: RuntimeContribution = {
    id: options.persistence.contribution.id,
    async ready(signal) {
      if (phase !== "draining") phase = "initializing";
      try {
        signal.throwIfAborted();
        await options.persistence.contribution.ready?.(signal);
        signal.throwIfAborted();
        await checkReadinessAsync();
        if (phase !== "draining") phase = "ready";
      } catch (error) {
        if (phase !== "draining") phase = "failed";
        throw error;
      }
    },
    dispose: () => options.persistence.contribution.dispose?.(),
  };
  if (options.authentication.kind === "authenticated-read") {
    const authentication = options.authentication;
    if (
      authentication.authHttpOwner !== options.persistence ||
      authHttpPublication.kind !== "enrolled" ||
      authHttpPublication.producer !== authentication.authHttpController ||
      authHttpPublication.routes !== authentication.authHttpRoutes ||
      authHttpRoutes !== authentication.authHttpRoutes
    )
      throw new Error("Host authentication HTTP enrollment identities changed");
    authentication.authHttpOwner.assertAuthHttpController(authentication.authHttpController);
    if (
      onboardingPublication.kind !== "enrolled" ||
      onboardingPublication.routes !== authentication.onboardingController.routes ||
      onboardingPublication.endpoints !== authentication.onboardingController.endpoints ||
      onboardingPublication.producer !== authentication.onboardingController.publication ||
      onboardingContributions.length !== 1 ||
      onboardingContributions[0]?.routes !== authentication.onboardingController.routes
    )
      throw new Error("Host onboarding enrollment identities changed");
    authentication.authHttpOwner.assertOnboardingWireController(authentication.onboardingController);
  }
  const application = createApplication({
    contributions: [
      persistence,
      foundation,
      {
        id: "public-resources",
        routes: [
          ...authHttpRoutes,
          ...authenticatedRoutes,
          ...fixedWriteRoutes,
          options.rpc,
          options.culture.localeCommit,
          ...(["/api", "/rpc", "/auth", "/streams", "/binary", "/assets"] as const).map((path): FetchContribution => {
            return {
              phase: "asset",
              path: hostPath(configuration, path),
              descendants: true,
              access: { kind: "public" },
              async handle() {
                return { kind: "response", response: Response.json({ code: "NOT_FOUND" }, { status: 404 }) };
              },
            };
          }),
        ],
      },
      ...onboardingContributions,
    ],
    services,
    authHttpPublication,
    onboardingPublication,
    async render(context) {
      context.signal.throwIfAborted();
      if (options.culture.classify(context.request).kind !== "document")
        return new Response("Not found", { status: 404 });
      const prepared = await options.culture.prepareAsync(context);
      context.signal.throwIfAborted();
      return options.render(context, prepared);
    },
    reportError(error, requestId) {
      if (requestId === "shutdown") cleanupErrors.push(error);
      try {
        options.reportError(error, requestId);
      } catch (reportingError) {
        if (requestId === "shutdown") cleanupErrors.push(reportingError);
      }
    },
  });

  const host: Application = {
    ready() {
      if (disposal) return Promise.reject(new Error("Resource host is draining or closed"));
      return application.ready().then(checkReadinessAsync);
    },
    fetch(request) {
      return application.fetch(request);
    },
    dispose() {
      if (disposal) return disposal;
      const shutdown = Promise.withResolvers<void>();
      disposal = shutdown.promise;
      phase = "draining";
      void shutdown.promise.catch(() => undefined);
      void (async () => {
        try {
          await application.dispose();
          if (cleanupErrors.length > 0) throw new AggregateError(cleanupErrors, "Resource host cleanup failed");
          if (options.persistence.runtime.phase !== "closed") throw new Error("Main persistence did not reach closed");
          phase = "closed";
        } catch (error) {
          phase = "close-failed";
          throw error;
        }
      })().then(shutdown.resolve, shutdown.reject);
      return disposal;
    },
  };

  return Object.freeze({
    application: Object.freeze(host),
    configuration,
    joinSlots: getRuntimeJoinSlots(options.authentication.kind),
    get phase() {
      if (phase === "ready" && options.persistence.runtime.phase !== "ready") {
        return options.persistence.runtime.phase === "failed" ? "failed" : "unavailable";
      }
      return phase;
    },
  });
}
