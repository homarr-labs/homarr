import { Auth, customFetch } from "@auth/core";
import type { AuthConfig } from "@auth/core";
import { CredentialsSignin, MissingCSRF } from "@auth/core/errors";
import Credentials from "@auth/core/providers/credentials";
import type { Profile, User } from "@auth/core/types";

import { colorSchemeCookieKey } from "@homarr/definitions";
import type { SupportedAuthProvider } from "@homarr/definitions";
import type { PersistenceRuntime } from "@homarr/db/runtime";
import type { AuthSessionSqlConfiguration } from "@homarr/db/runtime-auth-session";
import type { BoardPermissionsMutation } from "@homarr/db/runtime-board";
import type { AppMutation, AppMutationResult } from "@homarr/db/runtime-app";

import {
  createCookies,
  expireDateAfter,
  generateSessionToken,
  sessionTokenCookieName,
  writeSessionTokenCookie,
} from "../session-primitives";
import type { AuthCookieConfiguration } from "../session-primitives";
import type {
  SqlAuthorityConfiguration,
  SqlAuthorityOperation,
  SqlAuthorityReadLease,
} from "../sql-authority/contracts";
import { verifyBasicCredentialsAsync } from "../verifiers/basic-authorization";
import { EmptyNextAuthProvider } from "../../providers/empty/empty-provider";
import type { AuthVerifierLogger } from "../verifiers/contracts";
import { verifyLdapCredentialsAsync } from "../verifiers/ldap-authorization";
import type { LdapVerifierResources } from "../verifiers/ldap-authorization";
import { createStagedOidcAdapter } from "./adapter";
import { createBoundedIssuerBodyReader } from "./bounded-body";
import type { IssuerBodyBudget } from "./bounded-body";
import { createIssuerOidcProvider, issuerProfileName, issuerProfileValue } from "./oidc";
import type { IssuerOidcConfiguration } from "./oidc";
import { createIssuerOriginGuard, IssuerRequestRejectedError, readSingleCookie } from "./origin";
import type { IssuerOriginConfiguration } from "./origin";
import {
  IssuerOperationLedger,
  IssuerStagingError,
  retainPreparedIssuerOperation,
  snapshotIssuerSession,
  snapshotIssuerUser,
} from "./persistence";
import {
  admitIssuerSessionReadAsync,
  assertProductionSessionSqlConfiguration,
  beginIssuerSqlScope,
  closeIssuerSqlScope,
  closeProductionSessionSqlOwner,
  createProductionSessionSqlOwner,
  createProductionSessionSqlOnboardingCoreController,
  assertProductionSessionSqlOnboardingCoreController,
  createProductionSessionHttpExecutor,
  discardPreparedIssuerOperation,
  dispatchProductionSessionSqlBoardPermissionsAsync,
  dispatchProductionSessionSqlAppCreateAsync,
  getProductionSessionSqlRequestReader,
  issuerSqlScopeResources,
  observeIssuerSessionAsync,
  recheckIssuerSessionObservationAsync,
  persistPreparedIssuerOperation,
  readProductionSessionSqlRequestUserAsync,
  runIssuerSqlScopeAsync,
  settleIssuerResponseAsync,
  configureProductionSessionSqlOnboarding,
  captureProductionSessionSqlOnboardingRequest,
  prepareProductionSessionSqlOnboardingClaimAsync,
  prepareProductionSessionSqlOnboardNextStepAsync,
  prepareProductionSessionSqlOnboardingInitUserAsync,
  prepareProductionSessionSqlInitialExternalGroupAsync,
  dispatchProductionSessionSqlOnboardingClaimAsync,
  dispatchProductionSessionSqlOnboardNextStepAsync,
  dispatchProductionSessionSqlOnboardingInitUserAsync,
  dispatchProductionSessionSqlInitialExternalGroupAsync,
  disposeProductionSessionSqlOnboardingRequestAsync,
  readProductionSessionSqlOnboardingRpcPacketAsync,
  resolveProductionSessionSqlOnboardingRpcPacketAsync,
  createProductionSessionSqlOnboardingRpcFrame,
  assertProductionSessionSqlOnboardingRpcFrame,
  getProductionSessionSqlOnboardingRequestBounds,
  prepareProductionSessionSqlOnboardNextStepFromCodecAsync,
  prepareProductionSessionSqlOnboardingInitUserFromCodecAsync,
  prepareProductionSessionSqlInitialExternalGroupFromCodecAsync,
  captureProductionSessionSqlOnboardingCsrfRequest,
  prepareProductionSessionSqlOnboardingCsrfAsync,
  disposeProductionSessionSqlOnboardingCsrfRequestAsync,
  recordProductionSessionSqlOnboardingResponseAsync,
  readProductionSessionSqlOnboardingPublication,
  settleProductionSessionSqlOnboardingPublicationAsync,
} from "./sql-persistence";
import { captureProductionOnboardingPolicy, ProductionOnboardingError } from "./onboarding";
import type {
  PreparedProductionInitialExternalGroup,
  PreparedProductionOnboardingClaim,
  PreparedProductionOnboardingInitUser,
  PreparedProductionOnboardNextStep,
  ProductionOnboardingClaimOutput,
  ProductionOnboardingPolicy,
  ProductionOnboardingRequest,
  ProductionOnboardingRpcPacket,
  ProductionOnboardingRpcFrame,
  ProductionOnboardingRpcContext,
  ProductionOnboardingRpcInputSource,
  ProductionOnboardingInputTicket,
  ProductionOnboardNextStepInputTicket,
  ProductionOnboardingInitUserInputTicket,
  ProductionInitialExternalGroupInputTicket,
  ProductionOnboardingCsrfRequest,
  ProductionOnboardingCsrfOutput,
  ProductionOnboardingPublication,
  ProductionOnboardingPublicationResult,
  ProductionOnboardingResponseOutcome,
} from "./onboarding";
import type {
  CoreConfiguration,
  ProductionOnboardingCoreController,
  ProductionSessionRequestUser,
  ProductionSessionSqlOwner,
} from "./sql-persistence";
import type {
  IssuerEffect,
  IssuerProposalContext,
  IssuerOperationBounds,
  IssuerReadWitness,
  IssuerUserRecord,
  PreparedIssuerOperation,
  LegacyIssuerHttpAction,
} from "./persistence";

export { IssuerDurableJoinRequiredError } from "./persistence";
export type { PreparedIssuerOperation, IssuerOperationBounds } from "./persistence";
export type { IssuerBodyBudget } from "./bounded-body";
export type {
  CoreConfiguration,
  CoreSelection,
  CoreReadResult,
  CoreRequest,
  CoreCurrentStepRequest,
  CoreEnvironmentRequest,
  ProductionOnboardingCoreController,
} from "./sql-persistence";

export interface ProductionSessionIssuerConfiguration {
  readonly origin: IssuerOriginConfiguration;
  readonly coreSecret: string;
  readonly maxAgeSeconds: number;
  readonly updateAgeSeconds: number;
  readonly providers: readonly ("oidc" | "credentials" | "ldap")[];
  readonly oidc: IssuerOidcConfiguration | null;
  readonly bodyBudget: IssuerBodyBudget;
  readonly onboarding?: ProductionOnboardingPolicy | undefined;
}

export interface ProductionSessionIssuerResources {
  readonly sql: ProductionSessionSqlOwner;
  readonly ldap: Omit<LdapVerifierResources, "repository" | "logger" | "now"> | null;
}

export interface ProductionSessionRequestConfiguration {
  readonly externalOrigin: string;
  readonly cookies: Readonly<AuthCookieConfiguration>;
  readonly providers: readonly SupportedAuthProvider[];
  readonly now: () => number;
}

export type ProductionSessionLdapResources = ProductionSessionIssuerResources["ldap"];
export type ProductionSessionApiKeyConfiguration = SqlAuthorityConfiguration["apiKeys"];

const productionSqlIssuers = new WeakMap<object, ProductionSessionSqlOwner>();

const suppressedVerifierLogger: AuthVerifierLogger = Object.freeze({
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
});

function prepareSessionResponse(
  cookies: AuthCookieConfiguration,
  session: { sessionToken: string; expires: Date },
  redirect: string,
): Response {
  if (!Number.isFinite(session.expires.valueOf())) throw new IssuerStagingError();
  const headers = new Headers({ location: redirect, "cache-control": "no-store" });
  writeSessionTokenCookie(
    {
      set(name, value, options) {
        const attributes = ["Path=/", "HttpOnly", "SameSite=Lax", `Expires=${options.expires.toUTCString()}`];
        if (options.secure) attributes.push("Secure");
        headers.append("set-cookie", `${name}=${encodeURIComponent(value)}; ${attributes.join("; ")}`);
      },
    },
    cookies,
    session,
  );
  return new Response(null, { status: 303, headers });
}

function prepareColorSchemeCookie(response: Response, colorScheme: string, now: () => number): void {
  if (!["light", "dark", "auto"].includes(colorScheme)) throw new IssuerStagingError();
  const expiry = new Date(now());
  expiry.setFullYear(expiry.getFullYear() + 1);
  response.headers.append(
    "set-cookie",
    `${colorSchemeCookieKey}=${encodeURIComponent(colorScheme)}; Path=/; Expires=${expiry.toUTCString()}`,
  );
}

function loginEffect(
  user: IssuerUserRecord,
  name: string | null,
  externalGroups: readonly string[] | null,
  picture: string | null,
): IssuerEffect {
  let groups: Extract<IssuerEffect, { kind: "login-effects" }>["groups"] = { kind: "preserve" };
  if (externalGroups !== null) groups = { kind: "synchronize-existing", names: [...externalGroups] };
  let image: Extract<IssuerEffect, { kind: "login-effects" }>["image"] = { kind: "preserve" };
  if (picture !== null && user.provider === "oidc" && !user.image?.startsWith("data:")) {
    image = { kind: "external", value: picture };
  }
  return {
    kind: "login-effects",
    userId: user.id,
    name,
    image,
    groups,
    everyone: "existing-group-only",
    colorScheme: user.colorScheme,
  };
}

function profileGroups(profile: Profile, attribute: string): readonly string[] | null {
  const value = issuerProfileValue(profile, attribute);
  if (!Array.isArray(value)) return null;
  const names: string[] = [];
  for (const name of value) {
    if (typeof name !== "string") throw new IssuerStagingError();
    names.push(name);
  }
  return names;
}

async function settleUnretainedIssuerPreparationAsync(
  owner: ProductionSessionSqlOwner,
  scope: object,
  ledger: IssuerOperationLedger,
  response: Response | null | undefined,
): Promise<void> {
  const settled = await Promise.allSettled([
    ledger.drainAsync(),
    settleIssuerResponseAsync(response),
    closeIssuerSqlScope(owner, scope),
  ]);
  for (const item of settled.slice(1))
    if (item.status === "rejected") throw new IssuerStagingError(item.reason, "cleanup");
  const drained = settled.at(0);
  if (drained?.status === "rejected") {
    if (drained.reason instanceof IssuerStagingError) throw drained.reason;
    throw new IssuerStagingError(drained.reason);
  }
}

export function createProductionSessionIssuer(
  inputConfiguration: ProductionSessionIssuerConfiguration,
  inputResources: ProductionSessionIssuerResources,
) {
  const configuration = Object.freeze({
    ...inputConfiguration,
    origin: Object.freeze({
      ...inputConfiguration.origin,
      cookies: Object.freeze({ ...inputConfiguration.origin.cookies }),
    }),
    providers: Object.freeze([...inputConfiguration.providers]),
    oidc: inputConfiguration.oidc && Object.freeze({ ...inputConfiguration.oidc }),
    bodyBudget: Object.freeze({ ...inputConfiguration.bodyBudget }),
  });
  const resources = Object.freeze({
    ...inputResources,
    ldap:
      inputResources.ldap &&
      Object.freeze({ ...inputResources.ldap, configuration: Object.freeze({ ...inputResources.ldap.configuration }) }),
  });
  const guard = createIssuerOriginGuard(configuration.origin);
  const now = configuration.origin.now;
  const bodyReader = createBoundedIssuerBodyReader(configuration.bodyBudget, now);
  assertProductionSessionSqlConfiguration(resources.sql, configuration.maxAgeSeconds, now);
  if (
    configuration.coreSecret.length < 32 ||
    !Number.isSafeInteger(configuration.maxAgeSeconds) ||
    configuration.maxAgeSeconds <= 0 ||
    !Number.isSafeInteger(configuration.updateAgeSeconds) ||
    configuration.updateAgeSeconds < 0 ||
    configuration.updateAgeSeconds > configuration.maxAgeSeconds ||
    configuration.providers.length === 0 ||
    configuration.providers.some((provider) => !["credentials", "ldap", "oidc"].includes(provider)) ||
    new Set(configuration.providers).size !== configuration.providers.length ||
    (configuration.providers.includes("ldap") && !resources.ldap) ||
    (configuration.providers.includes("oidc") && !configuration.oidc)
  ) {
    throw new IssuerStagingError();
  }
  if (
    configuration.oidc &&
    (configuration.oidc.redirectUri !== `${guard.origin}/api/auth/callback/oidc` ||
      configuration.oidc.redirectProxyUrl !== `${guard.origin}/api/auth`)
  ) {
    throw new IssuerStagingError();
  }
  const assertBounds = (bounds: IssuerOperationBounds) => {
    const clock = now();
    if (
      bounds.signal.aborted ||
      bounds.lifetime.aborted ||
      !Number.isFinite(clock) ||
      !Number.isFinite(bounds.deadlineAt) ||
      bounds.deadlineAt <= clock
    ) {
      throw new IssuerStagingError();
    }
  };
  const assertProvider = (provider: "oidc" | "credentials" | "ldap") => {
    if (!configuration.providers.includes(provider)) throw new IssuerRequestRejectedError();
  };
  const admitExistingSession = async (
    request: Request,
    bounds: IssuerOperationBounds,
    ledger: IssuerOperationLedger,
    scope: object,
  ) => {
    const token = readSingleCookie(request, sessionTokenCookieName(configuration.origin.cookies.prefix));
    if (!token) return null;
    assertBounds(bounds);
    const lease = await ledger.run("reader-admission", () => admitIssuerSessionReadAsync(resources.sql, scope, token));
    if (!lease) return null;
    return { token, lease };
  };
  return Object.freeze({
    prepareCsrfCookie: guard.prepareCsrfCookie,
    async prepareLegacyHttpAsync(
      request: Request,
      kind: LegacyIssuerHttpAction,
      bounds: IssuerOperationBounds,
    ): Promise<PreparedIssuerOperation> {
      bounds = Object.freeze({ ...bounds });
      guard.assertCanonicalRequest(request);
      assertBounds(bounds);
      const path = new URL(request.url).pathname;
      const metadata = kind === "legacy-providers" || kind === "legacy-csrf" || kind === "legacy-signin";
      const callback = kind === "legacy-oidc" && path === "/api/auth/callback/oidc";
      const handshake = kind === "legacy-oidc" && path === "/api/auth/signin/oidc";
      const credentials = kind === "legacy-credentials" || kind === "legacy-ldap";
      if (
        (kind === "legacy-providers" && (path !== "/api/auth/providers" || request.method !== "GET")) ||
        (kind === "legacy-csrf" && (path !== "/api/auth/csrf" || request.method !== "GET")) ||
        (kind === "legacy-signin" && (path !== "/api/auth/signin" || request.method !== "GET")) ||
        (kind === "legacy-credentials" && (path !== "/api/auth/callback/credentials" || request.method !== "POST")) ||
        (kind === "legacy-ldap" && (path !== "/api/auth/callback/ldap" || request.method !== "POST")) ||
        (kind === "legacy-session" && (path !== "/api/auth/session" || !["GET", "POST"].includes(request.method))) ||
        (kind === "legacy-signout" && (path !== "/api/auth/signout" || request.method !== "POST")) ||
        (kind === "legacy-oidc" &&
          ((!callback && !handshake) ||
            (handshake && request.method !== "POST") ||
            !["GET", "POST"].includes(request.method)))
      )
        throw new IssuerRequestRejectedError();
      if (kind === "legacy-credentials") assertProvider("credentials");
      if (kind === "legacy-ldap") assertProvider("ldap");
      if (kind === "legacy-oidc") assertProvider("oidc");
      if (request.method === "POST" && !callback) guard.assertSameOrigin(request);
      const scope = beginIssuerSqlScope(resources.sql, {
        ...bounds,
        signal: AbortSignal.any([bounds.signal, request.signal]),
      });
      const ledger = new IssuerOperationLedger();
      const networkResponses = new Set<Response>();
      let retained = false;
      let response: Response | undefined;
      const settleUnretainedLegacyPreparationAsync = async () => {
        const settled = await Promise.allSettled([
          settleUnretainedIssuerPreparationAsync(resources.sql, scope, ledger, response),
          ...[...networkResponses].map((response) => settleIssuerResponseAsync(response)),
        ]);
        for (const item of settled)
          if (item !== settled[0] && item.status === "rejected") throw new IssuerStagingError(item.reason, "cleanup");
        const preparation = settled[0];
        if (preparation?.status === "rejected") throw preparation.reason;
      };
      try {
        const scoped = issuerSqlScopeResources(resources.sql, scope);
        bounds = scoped.bounds;
        const cookies = createCookies(configuration.origin.cookies);
        for (const cookie of Object.values(cookies)) readSingleCookie(request, cookie.name);
        for (const part of (request.headers.get("cookie") ?? "").split(";")) {
          const name = part.trim().split("=")[0];
          if (name?.startsWith(cookies.sessionToken.name) && name !== cookies.sessionToken.name)
            throw new IssuerRequestRejectedError();
        }
        const query = new URL(request.url).searchParams;
        for (const key of query.keys()) if (query.getAll(key).length !== 1) throw new IssuerRequestRejectedError();
        const bytes = await ledger.run("body", () =>
          runIssuerSqlScopeAsync(resources.sql, scope, () => bodyReader.readBytes(request, bounds)),
        );
        let form: URLSearchParams | null = null;
        if (request.method === "POST") {
          if (!bytes) throw new IssuerRequestRejectedError();
          const contentType = request.headers.get("content-type") ?? "";
          const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
          if (kind === "legacy-session") {
            if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(contentType))
              throw new IssuerRequestRejectedError();
            const input: unknown = JSON.parse(text);
            const keys = new Set<string>();
            let depth = 0;
            for (let index = 0; index < text.length; index += 1) {
              const character = text[index];
              if (character === "{" || character === "[") depth += 1;
              else if (character === "}" || character === "]") depth -= 1;
              else if (character === '"') {
                let end = index + 1;
                while (end < text.length && text[end] !== '"') {
                  if (text[end] === "\\") end += 1;
                  end += 1;
                }
                if (depth === 1 && /^\s*:/.test(text.slice(end + 1))) {
                  const key: unknown = JSON.parse(text.slice(index, end + 1));
                  if (typeof key !== "string" || keys.has(key)) throw new IssuerRequestRejectedError();
                  keys.add(key);
                }
                index = end;
              }
            }
            if (
              typeof input !== "object" ||
              input === null ||
              Array.isArray(input) ||
              Object.keys(input).some((key) => key !== "csrfToken" && key !== "data") ||
              (Object.hasOwn(input, "csrfToken") && typeof Reflect.get(input, "csrfToken") !== "string")
            )
              throw new IssuerRequestRejectedError();
          } else {
            if (!/^application\/x-www-form-urlencoded(?:\s*;\s*charset=utf-8)?$/i.test(contentType))
              throw new IssuerRequestRejectedError();
            for (const field of text.split("&")) {
              for (const scalar of field.split("=")) decodeURIComponent(scalar.replaceAll("+", " "));
            }
            form = new URLSearchParams(text);
            for (const [key, value] of form) {
              if (
                form.getAll(key).length !== 1 ||
                !key.isWellFormed() ||
                !value.isWellFormed() ||
                key.includes("\u0000") ||
                value.includes("\u0000")
              )
                throw new IssuerRequestRejectedError();
              if (credentials && !["name", "password", "provider", "csrfToken", "callbackUrl"].includes(key))
                throw new IssuerRequestRejectedError();
              if ((kind === "legacy-signout" || handshake) && !["csrfToken", "callbackUrl"].includes(key))
                throw new IssuerRequestRejectedError();
            }
          }
        }
        const boundedRequest = guard.coreRequest(
          new Request(request.url, {
            method: request.method,
            headers: request.headers,
            body: bytes,
            referrer: request.referrer,
            referrerPolicy: request.referrerPolicy,
            signal: AbortSignal.any([request.signal, bounds.signal, bounds.lifetime]),
          }),
        );
        const token = readSingleCookie(request, cookies.sessionToken.name);
        let observation: Awaited<ReturnType<typeof observeIssuerSessionAsync>> | null = null;
        if (kind === "legacy-session" || kind === "legacy-signout" || kind === "legacy-oidc") {
          observation = await ledger.run("owned-observation", () =>
            observeIssuerSessionAsync(resources.sql, scope, token),
          );
          if (observation.type === "active")
            bounds = Object.freeze({
              ...bounds,
              deadlineAt: Math.min(bounds.deadlineAt, observation.record.locator.hostDeadlineAt),
            });
          if (kind === "legacy-oidc" && observation.type === "expired") throw new IssuerStagingError();
        }
        let admittedSession: { token: string; userId: string; expiresAt: number } | null = null;
        if (observation?.type === "active")
          admittedSession = {
            token: observation.record.locator.token,
            userId: observation.record.user.id,
            expiresAt: observation.record.locator.expiresAt,
          };
        const staged = createStagedOidcAdapter({
          repository: scoped.repository,
          ledger,
          dangerousCredentialsLinking: configuration.oidc?.dangerousCredentialsLinking ?? false,
          admittedSession,
          now,
          ...(observation && { observation, observationToken: token }),
        });
        let verifiedUser: User | null = null;
        let verifiedProvider: "credentials" | "ldap" | null = null;
        let verifiedName: string | null = null;
        let verifiedGroups: readonly string[] | null = null;
        const selection: { user: IssuerUserRecord | null } = { user: null };
        let basicRejected = false;
        let verificationStarted = false;
        let negative: "credentials" | "csrf" | null = null;
        let canonicalCallbackUrl = guard.origin;
        let verifiedAccountId: string | null = null;
        let loginUserId: string | null = null;
        const authorize = (
          provider: "credentials" | "ldap",
          input: Partial<Record<"name" | "password" | "provider", unknown>>,
        ) =>
          ledger.run("verification", async () => {
            if (
              !credentials ||
              (provider === "credentials" && kind !== "legacy-credentials") ||
              (provider === "ldap" && kind !== "legacy-ldap") ||
              verifiedUser ||
              verificationStarted ||
              basicRejected ||
              !form ||
              input.name !== form.get("name") ||
              input.password !== form.get("password") ||
              input.provider !== provider ||
              form.get("provider") !== provider
            )
              throw new IssuerStagingError();
            verificationStarted = true;
            if (provider === "credentials") {
              const verified = await runIssuerSqlScopeAsync(resources.sql, scope, () =>
                verifyBasicCredentialsAsync(
                  {
                    logger: suppressedVerifierLogger,
                    repository: {
                      async findUserByName(selector) {
                        const selected = await scoped.repository.findUserByName(selector);
                        if (selected && (selected.provider !== "credentials" || selected.name !== selector.name))
                          throw new IssuerStagingError();
                        selection.user = selected && snapshotIssuerUser(selected);
                        staged.witnesses.push({ kind: "user-name", ...selector, selected: selection.user });
                        return selection.user;
                      },
                    },
                  },
                  input,
                ),
              );
              if (!verified) {
                basicRejected = true;
                return null;
              }
              if (!selection.user || selection.user.id !== verified.id || !selection.user.password)
                throw new IssuerStagingError();
              verifiedUser = verified;
              verifiedName = verified.name;
            } else {
              const ldap = resources.ldap;
              if (!ldap) throw new IssuerStagingError();
              const verified = await runIssuerSqlScopeAsync(resources.sql, scope, () =>
                verifyLdapCredentialsAsync(
                  {
                    ...ldap,
                    now,
                    logger: suppressedVerifierLogger,
                    createClient() {
                      const client = ldap.createClient();
                      return {
                        bindAsync: (options) => ledger.run("ldap-bind", () => client.bindAsync(options)),
                        searchAsync: (options) => ledger.run("ldap-search", () => client.searchAsync(options)),
                        disconnectAsync: () => ledger.settle("ldap-disconnect", () => client.disconnectAsync()),
                      };
                    },
                    repository: {
                      async findUserByEmail(selector) {
                        const selected = await scoped.repository.findUserByEmail(selector);
                        if (selected && (selected.provider !== "ldap" || selected.email !== selector.email))
                          throw new IssuerStagingError();
                        selection.user = selected && snapshotIssuerUser(selected);
                        staged.witnesses.push({ kind: "user-email", ...selector, selected: selection.user });
                        return selection.user;
                      },
                      async insertUser(user) {
                        if (selection.user || (await scoped.repository.findUserById(user.id)))
                          throw new IssuerStagingError();
                        staged.witnesses.push({ kind: "user-id", id: user.id, selected: null });
                        selection.user = snapshotIssuerUser({ ...user, password: null, colorScheme: "dark" });
                        staged.effects.push({ kind: "create-user", user: selection.user });
                      },
                    },
                  },
                  input,
                ),
              );
              if (!verified || !selection.user || selection.user.id !== verified.id) throw new IssuerStagingError();
              verifiedUser = verified;
              verifiedName = verified.name;
              verifiedGroups = verified.groups;
            }
            assertBounds(bounds);
            if (!selection.user) throw new IssuerStagingError();
            verifiedProvider = provider;
            staged.stageVerifiedUser(selection.user);
            return verifiedUser;
          });
        const denyPreconnect = () => {
          throw new IssuerStagingError();
        };
        const providers: AuthConfig["providers"] = [];
        for (const provider of configuration.providers) {
          if (provider === "oidc") {
            if (!configuration.oidc) throw new IssuerStagingError();
            const oidc = configuration.oidc;
            providers.push(
              createIssuerOidcProvider({
                ...oidc,
                fetch: Object.assign(
                  (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) =>
                    ledger.run("oidc-fetch", () =>
                      runIssuerSqlScopeAsync(resources.sql, scope, async () => {
                        const signals = [bounds.signal, bounds.lifetime];
                        if (init?.signal) signals.push(init.signal);
                        if (input instanceof Request) signals.push(input.signal);
                        const response = await oidc.fetch(input, { ...init, signal: AbortSignal.any(signals) });
                        networkResponses.add(response);
                        return response;
                      }),
                    ),
                  { preconnect: denyPreconnect },
                ),
              }),
            );
          } else {
            let name = "Credentials";
            if (provider === "ldap") name = "Ldap";
            providers.push(
              Credentials({
                id: provider,
                name,
                credentials: { name: {}, password: {}, provider: {} },
                authorize: (input) => authorize(provider, input),
              }),
            );
          }
        }
        if (!metadata)
          providers.push({
            ...EmptyNextAuthProvider(),
            [customFetch]: Object.assign(
              async () => {
                ledger.fail();
                throw new IssuerStagingError();
              },
              { preconnect: denyPreconnect },
            ),
          });
        const coreStartedAt = Date.now();
        let strategy: "jwt" | "database" = "database";
        if (metadata) strategy = "jwt";
        response = await ledger.run("core", () =>
          runIssuerSqlScopeAsync(resources.sql, scope, () =>
            Auth(boundedRequest, {
              basePath: "/api/auth",
              secret: configuration.coreSecret,
              trustHost: true,
              debug: false,
              useSecureCookies: configuration.origin.cookies.useSecureCookies,
              cookies,
              providers,
              ...(!metadata && { adapter: staged.adapter }),
              session: {
                strategy,
                maxAge: configuration.maxAgeSeconds,
                updateAge: configuration.updateAgeSeconds,
                generateSessionToken,
              },
              ...(configuration.oidc && { redirectProxyUrl: configuration.oidc.redirectProxyUrl }),
              pages: { signIn: "/auth/login", error: "/auth/login" },
              logger: {
                error(error) {
                  if (!negative && staged.effects.length === 0 && !verifiedUser && !verifiedAccountId) {
                    if (
                      error instanceof CredentialsSignin &&
                      error.code === "credentials" &&
                      basicRejected &&
                      kind === "legacy-credentials"
                    ) {
                      negative = "credentials";
                      ledger.recordCoreNegative("credentials");
                      return;
                    }
                    if (
                      error instanceof MissingCSRF &&
                      request.method === "POST" &&
                      !verificationStarted &&
                      !basicRejected &&
                      !selection.user
                    ) {
                      negative = "csrf";
                      ledger.recordCoreNegative("csrf");
                      return;
                    }
                  }
                  ledger.fail();
                },
                warn: () => undefined,
                debug: () => undefined,
              },
              callbacks: {
                redirect({ url }) {
                  const target = guard.redirect(url);
                  canonicalCallbackUrl = target;
                  return target;
                },
                signIn: ({ user, account, profile }) =>
                  ledger.run("verified-login", async () => {
                    if (credentials) {
                      if (
                        !verifiedUser ||
                        user !== verifiedUser ||
                        !selection.user ||
                        !account ||
                        !canonicalCallbackUrl ||
                        account.type !== "credentials" ||
                        account.provider !== verifiedProvider ||
                        account.providerAccountId !== selection.user.id ||
                        user.id !== selection.user.id ||
                        staged.effects.some((effect) => effect.kind === "create-session")
                      )
                        throw new IssuerStagingError();
                      const selectedUser = selection.user;
                      const session = {
                        sessionToken: generateSessionToken(),
                        userId: selectedUser.id,
                        expires: expireDateAfter(configuration.maxAgeSeconds, now),
                      };
                      if (!staged.adapter.createSession) throw new IssuerStagingError();
                      await staged.adapter.createSession(session);
                      await ledger.run("critical-login-effects", async () => {
                        staged.effects.push(loginEffect(selectedUser, verifiedName, verifiedGroups, null));
                      });
                      loginUserId = selectedUser.id;
                      return canonicalCallbackUrl;
                    }
                    if (
                      !callback ||
                      !account ||
                      account.provider !== "oidc" ||
                      account.type !== "oidc" ||
                      !profile?.sub ||
                      account.providerAccountId !== profile.sub
                    )
                      throw new IssuerStagingError();
                    verifiedAccountId = account.providerAccountId;
                    return true;
                  }),
                session: ({ session, user }) =>
                  ledger.run("session-dto", async () => {
                    if (
                      kind !== "legacy-session" ||
                      observation?.type !== "active" ||
                      user.id !== observation.record.user.id ||
                      new Date(session.expires).getTime() !== observation.record.session.expires.getTime()
                    )
                      throw new IssuerStagingError();
                    const selected = observation.record.user;
                    return {
                      expires: observation.record.session.expires.toISOString(),
                      user: {
                        id: selected.id,
                        name: selected.name,
                        email: selected.email,
                        image: selected.image,
                        colorScheme: selected.colorScheme,
                        permissions: [...observation.record.permissions],
                      },
                    };
                  }),
                jwt: async () => {
                  ledger.fail();
                  throw new IssuerStagingError();
                },
              },
              events: {
                signIn: ({ user, account, profile }) =>
                  ledger.run("critical-login-effects", async () => {
                    const oidc = configuration.oidc;
                    if (
                      !callback ||
                      !oidc ||
                      !user.id ||
                      !account ||
                      account.provider !== "oidc" ||
                      account.providerAccountId !== verifiedAccountId ||
                      !profile
                    )
                      throw new IssuerStagingError();
                    const selected = await staged.getSelectedUser(user.id);
                    if (!selected) throw new IssuerStagingError();
                    let name = user.name ?? null;
                    let groups: readonly string[] | null = null;
                    let picture: string | null = null;
                    if (selected.provider === "oidc") {
                      const extracted = issuerProfileName(profile, oidc.nameAttribute);
                      if (!extracted) throw new IssuerStagingError();
                      name = extracted;
                      if (!oidc.groupsLocalManagement) groups = profileGroups(profile, oidc.groupsAttribute);
                      if (typeof profile.picture === "string") picture = profile.picture;
                    }
                    staged.effects.push(loginEffect(selected, name, groups, picture));
                    loginUserId = selected.id;
                  }),
              },
            }),
          ),
        );
        const coreFinishedAt = Date.now();
        const releasedNetwork = await Promise.allSettled(
          [...networkResponses].map((response) =>
            ledger.settle("oidc-response-release", () => settleIssuerResponseAsync(response)),
          ),
        );
        if (releasedNetwork.some((item) => item.status === "rejected"))
          throw new IssuerStagingError(undefined, "cleanup");
        networkResponses.clear();
        let browserExpiresAt: number | null = null;
        for (const cookie of response.headers.getSetCookie()) {
          if (!cookie.startsWith(`${cookies.sessionToken.name}=`)) continue;
          for (const part of cookie.split(";").slice(1)) {
            if (part.trim().toLowerCase().startsWith("expires=")) {
              browserExpiresAt = Date.parse(part.trim().slice("expires=".length));
              if (!Number.isSafeInteger(browserExpiresAt)) throw new IssuerStagingError();
            }
          }
        }
        await ledger.drainAsync();
        assertBounds(bounds);
        let classification: NonNullable<IssuerProposalContext["legacy"]>["classification"];
        const required = ["body", "core"];
        if (negative === "csrf") {
          classification = { type: "csrf-rejected" };
          required.push("core-negative-csrf");
        } else if (negative === "credentials" && basicRejected) {
          classification = { type: "verification-rejected", provider: "credentials" };
          required.push("verification", "core-negative-credentials");
        } else if (metadata) {
          let action: "providers" | "csrf" | "signin" = "signin";
          if (kind === "legacy-providers") action = "providers";
          if (kind === "legacy-csrf") action = "csrf";
          classification = { type: "metadata", action };
        } else if (handshake) classification = { type: "handshake", method: "POST" };
        else if (kind === "legacy-session") {
          if (observation?.type === "active") {
            const renewals = staged.effects.filter((effect) => effect.kind === "renew-session");
            if (renewals.length > 1 || staged.effects.length !== renewals.length) throw new IssuerStagingError();
            classification = { type: "session-active", due: renewals.length === 1 };
            required.push("session-dto");
          } else if (observation?.type === "expired") classification = { type: "session-expired" };
          else if (observation?.type === "absent") classification = { type: "session-absent" };
          else throw new IssuerStagingError();
        } else if (kind === "legacy-signout") {
          if (!observation) throw new IssuerStagingError();
          classification = { type: "signout", session: observation.type };
        } else {
          if (!loginUserId) throw new IssuerStagingError();
          let provider: "credentials" | "ldap" | "oidc" = "oidc";
          if (kind === "legacy-credentials") provider = "credentials";
          if (kind === "legacy-ldap") provider = "ldap";
          classification = { type: "login", provider, userId: loginUserId };
          required.push("verified-login", "critical-login-effects");
          if (credentials) required.push("verification");
        }
        if (observation) {
          await ledger.run("observation-current", () =>
            recheckIssuerSessionObservationAsync(resources.sql, scope, bounds.deadlineAt),
          );
          required.push("owned-observation", "observation-current");
        }
        if (
          classification.type === "csrf-rejected" ||
          classification.type === "verification-rejected" ||
          classification.type === "metadata" ||
          classification.type === "handshake" ||
          classification.type === "session-absent" ||
          (classification.type === "signout" && classification.session === "absent")
        ) {
          if (staged.effects.length !== 0 || loginUserId || verifiedAccountId) throw new IssuerStagingError();
        }
        let accountSelector: IssuerProposalContext["accountSelector"] = null;
        if (verifiedAccountId) accountSelector = { provider: "oidc", providerAccountId: verifiedAccountId };
        const prepared = retainPreparedIssuerOperation(
          kind,
          staged.witnesses,
          staged.effects,
          response,
          ledger,
          required,
          bounds,
          {
            owner: resources.sql,
            scope,
            accountSelector,
            legacy: {
              request,
              observation,
              classification,
              callbackUrl: canonicalCallbackUrl,
              coreStartedAt,
              coreFinishedAt,
              browserExpiresAt,
              maxAgeSeconds: configuration.maxAgeSeconds,
              updateAgeSeconds: configuration.updateAgeSeconds,
            },
          },
        );
        retained = true;
        return prepared;
      } finally {
        if (!retained) {
          await settleUnretainedLegacyPreparationAsync();
        }
      }
    },
    async prepareCredentials(
      request: Request,
      provider: "credentials" | "ldap",
      bounds: IssuerOperationBounds,
    ): Promise<PreparedIssuerOperation | null> {
      bounds = Object.freeze({ ...bounds });
      assertProvider(provider);
      guard.assertMutation(request);
      assertBounds(bounds);
      const scope = beginIssuerSqlScope(resources.sql, {
        ...bounds,
        signal: AbortSignal.any([bounds.signal, request.signal]),
      });
      let retained = false;
      const ledger = new IssuerOperationLedger();
      let response: Response | undefined;
      try {
        const scoped = issuerSqlScopeResources(resources.sql, scope);
        bounds = scoped.bounds;
        const witnesses: IssuerReadWitness[] = [];
        const effects: IssuerEffect[] = [];
        const selection: { user: IssuerUserRecord | null } = { user: null };
        const input: unknown = await ledger.run("body", () =>
          runIssuerSqlScopeAsync(resources.sql, scope, () => bodyReader.readJson(request, bounds)),
        );
        assertBounds(bounds);
        let user: IssuerUserRecord | null = null;
        let name: string | null = null;
        let groups: readonly string[] | null = null;
        if (provider === "credentials") {
          const verified = await ledger.run("verification", () =>
            runIssuerSqlScopeAsync(resources.sql, scope, () =>
              verifyBasicCredentialsAsync(
                {
                  logger: suppressedVerifierLogger,
                  repository: {
                    async findUserByName(selector) {
                      const selected = await scoped.repository.findUserByName(selector);
                      if (selected && (selected.provider !== "credentials" || selected.name !== selector.name)) {
                        throw new IssuerStagingError();
                      }
                      if (selected) selection.user = snapshotIssuerUser(selected);
                      witnesses.push({ kind: "user-name", ...selector, selected: selection.user });
                      return selection.user;
                    },
                  },
                },
                input,
              ),
            ),
          );
          if (!verified) {
            ledger.seal(["body", "verification"]);
            assertBounds(bounds);
            return null;
          }
          user = selection.user;
          name = verified.name;
          if (!user || user.id !== verified.id || !user.password) throw new IssuerStagingError();
        } else {
          const ldap = resources.ldap;
          if (!ldap) throw new IssuerStagingError();
          const verified = await ledger.run("verification", () =>
            runIssuerSqlScopeAsync(resources.sql, scope, () =>
              verifyLdapCredentialsAsync(
                {
                  ...ldap,
                  now,
                  logger: suppressedVerifierLogger,
                  createClient() {
                    const client = ldap.createClient();
                    return {
                      bindAsync: (options) => ledger.run("ldap-bind", () => client.bindAsync(options)),
                      searchAsync: (options) => ledger.run("ldap-search", () => client.searchAsync(options)),
                      disconnectAsync: () => ledger.settle("ldap-disconnect", () => client.disconnectAsync()),
                    };
                  },
                  repository: {
                    async findUserByEmail(selector) {
                      const selected = await scoped.repository.findUserByEmail(selector);
                      if (selected && (selected.provider !== "ldap" || selected.email !== selector.email)) {
                        throw new IssuerStagingError();
                      }
                      if (selected) selection.user = snapshotIssuerUser(selected);
                      witnesses.push({ kind: "user-email", ...selector, selected: selection.user });
                      return selection.user;
                    },
                    async insertUser(staged) {
                      if (selection.user) throw new IssuerStagingError();
                      const existing = await scoped.repository.findUserById(staged.id);
                      if (existing) throw new IssuerStagingError();
                      witnesses.push({ kind: "user-id", id: staged.id, selected: null });
                      selection.user = snapshotIssuerUser({ ...staged, password: null, colorScheme: "dark" });
                      effects.push({ kind: "create-user", user: selection.user });
                    },
                  },
                },
                input,
              ),
            ),
          );
          if (!verified) throw new IssuerStagingError();
          user = selection.user;
          name = verified.name;
          groups = verified.groups;
          if (!user || user.id !== verified.id) throw new IssuerStagingError();
        }
        assertBounds(bounds);
        const session = {
          sessionToken: generateSessionToken(),
          userId: user.id,
          expires: expireDateAfter(configuration.maxAgeSeconds, now),
        };
        await ledger.run("session-token-absence", async () => {
          if (await scoped.repository.findSession(session.sessionToken)) throw new IssuerStagingError();
          witnesses.push({ kind: "session", token: session.sessionToken, selected: null });
        });
        effects.push({ kind: "create-session", session }, loginEffect(user, name, groups, null));
        response = await ledger.run("response-preparation", async () => {
          let callbackUrl =
            readSingleCookie(request, createCookies(configuration.origin.cookies).callbackUrl.name) ?? "/";
          if (typeof input === "object" && input !== null && Object.hasOwn(input, "callbackUrl")) {
            const supplied = Reflect.get(input, "callbackUrl");
            if (typeof supplied === "string") callbackUrl = supplied;
          }
          const staged = prepareSessionResponse(configuration.origin.cookies, session, guard.redirect(callbackUrl));
          prepareColorSchemeCookie(staged, user.colorScheme, now);
          return staged;
        });
        assertBounds(bounds);
        const operation = retainPreparedIssuerOperation(
          provider,
          witnesses,
          effects,
          response,
          ledger,
          ["body", "verification", "response-preparation"],
          bounds,
          { owner: resources.sql, scope, accountSelector: null, classification: { type: "write" } },
        );
        retained = true;
        return operation;
      } finally {
        if (!retained) {
          await settleUnretainedIssuerPreparationAsync(resources.sql, scope, ledger, response);
        }
      }
    },
    async prepareOidc(request: Request, bounds: IssuerOperationBounds): Promise<PreparedIssuerOperation> {
      bounds = Object.freeze({ ...bounds });
      assertProvider("oidc");
      guard.assertCanonicalRequest(request);
      assertBounds(bounds);
      const oidc = configuration.oidc;
      if (!oidc) throw new IssuerStagingError();
      const pathname = new URL(request.url).pathname;
      const callback = pathname === "/api/auth/callback/oidc";
      const signIn = pathname === "/api/auth/signin/oidc";
      const read = ["/api/auth/csrf", "/api/auth/providers", "/api/auth/signin"].includes(pathname);
      if (
        (!callback && !signIn && !read) ||
        !["GET", "POST"].includes(request.method) ||
        (read && request.method !== "GET")
      ) {
        throw new IssuerRequestRejectedError();
      }
      if (!callback && request.method === "POST") guard.assertSameOrigin(request);
      const scope = beginIssuerSqlScope(resources.sql, {
        ...bounds,
        signal: AbortSignal.any([bounds.signal, request.signal]),
      });
      let retained = false;
      const ledger = new IssuerOperationLedger();
      let response: Response | undefined;
      try {
        const scoped = issuerSqlScopeResources(resources.sql, scope);
        bounds = scoped.bounds;
        for (const cookie of Object.values(createCookies(configuration.origin.cookies)))
          readSingleCookie(request, cookie.name);
        const coreHeaders = guard.coreRequest(
          new Request(request.url, { method: request.method, headers: request.headers }),
        ).headers;
        const boundedRequest = await ledger.run("body", () =>
          runIssuerSqlScopeAsync(resources.sql, scope, () =>
            bodyReader.reconstructRequest(request, bounds, coreHeaders),
          ),
        );
        assertBounds(bounds);
        const admitted = await admitExistingSession(request, bounds, ledger, scope);
        let admittedSession: { token: string; userId: string; expiresAt: number } | null = null;
        if (admitted) {
          if (admitted.lease.validity.type !== "stored-session-expiry") {
            throw new IssuerStagingError();
          }
          admittedSession = {
            token: admitted.token,
            userId: admitted.lease.identity.userId,
            expiresAt: admitted.lease.validity.expiresAt,
          };
          bounds = Object.freeze({
            ...bounds,
            deadlineAt: Math.min(bounds.deadlineAt, admitted.lease.validity.hostDeadlineAt),
          });
        }
        const staged = createStagedOidcAdapter({
          repository: scoped.repository,
          ledger,
          dangerousCredentialsLinking: oidc.dangerousCredentialsLinking,
          admittedSession,
          now,
        });
        let verifiedAccountId: string | null = null;
        let colorScheme: string | null = null;
        assertBounds(bounds);
        response = await ledger.run("core", () =>
          runIssuerSqlScopeAsync(resources.sql, scope, () =>
            Auth(boundedRequest, {
              basePath: "/api/auth",
              secret: configuration.coreSecret,
              trustHost: true,
              debug: false,
              useSecureCookies: configuration.origin.cookies.useSecureCookies,
              cookies: createCookies(configuration.origin.cookies),
              providers: [createIssuerOidcProvider(oidc)],
              adapter: staged.adapter,
              session: {
                strategy: "database",
                maxAge: configuration.maxAgeSeconds,
                updateAge: configuration.updateAgeSeconds,
                generateSessionToken,
              },
              redirectProxyUrl: oidc.redirectProxyUrl,
              pages: { signIn: "/auth/login", error: "/auth/login" },
              logger: { error: () => ledger.fail(), warn: () => undefined, debug: () => undefined },
              callbacks: {
                redirect: ({ url }) => guard.redirect(url),
                signIn: ({ account, profile }) =>
                  ledger.run("verified-oidc", async () => {
                    if (
                      !account ||
                      account.provider !== "oidc" ||
                      account.type !== "oidc" ||
                      !profile?.sub ||
                      account.providerAccountId !== profile.sub
                    ) {
                      throw new IssuerStagingError();
                    }
                    verifiedAccountId = account.providerAccountId;
                    return true;
                  }),
              },
              events: {
                signIn: ({ user, account, profile }) =>
                  ledger.run("critical-login-effects", async () => {
                    if (!user.id || !account || account.providerAccountId !== verifiedAccountId || !profile)
                      throw new IssuerStagingError();
                    const selected = await staged.getSelectedUser(user.id);
                    if (!selected) throw new IssuerStagingError();
                    let name = user.name ?? null;
                    let groups: readonly string[] | null = null;
                    let picture: string | null = null;
                    if (selected.provider === "oidc") {
                      const extracted = issuerProfileName(profile, oidc.nameAttribute);
                      if (!extracted) throw new IssuerStagingError();
                      name = extracted;
                      if (!oidc.groupsLocalManagement) groups = profileGroups(profile, oidc.groupsAttribute);
                      if (typeof profile.picture === "string") picture = profile.picture;
                    }
                    staged.effects.push(loginEffect(selected, name, groups, picture));
                    colorScheme = selected.colorScheme;
                  }),
              },
            }),
          ),
        );
        if (admitted) {
          await ledger.run("reader-current", () =>
            admitted.lease.assertCurrentAsync({ signal: bounds.signal, deadlineAt: bounds.deadlineAt }),
          );
        }
        assertBounds(bounds);
        if (response.status >= 400) throw new IssuerStagingError();
        const location = response.headers.get("location");
        if (location && new URL(location, guard.origin).searchParams.has("error")) throw new IssuerStagingError();
        if (colorScheme !== null) prepareColorSchemeCookie(response, colorScheme, now);
        const required = ["body", "core"];
        if (admitted) required.push("reader-current");
        if (callback) required.push("verified-oidc", "critical-login-effects");
        assertBounds(bounds);
        let accountSelector: { provider: "oidc"; providerAccountId: string } | null = null;
        if (verifiedAccountId !== null) accountSelector = { provider: "oidc", providerAccountId: verifiedAccountId };
        let classification: IssuerProposalContext["classification"] = { type: "write" };
        if (signIn) {
          if (request.method === "GET" || request.method === "POST")
            classification = { type: "oidc-handshake", method: request.method };
        } else if (!callback) {
          if (pathname === "/api/auth/csrf") classification = { type: "oidc-read", action: "csrf" };
          if (pathname === "/api/auth/providers") classification = { type: "oidc-read", action: "providers" };
          if (pathname === "/api/auth/signin") classification = { type: "oidc-read", action: "signin" };
        }
        const prepared = retainPreparedIssuerOperation(
          "oidc",
          staged.witnesses,
          staged.effects,
          response,
          ledger,
          required,
          bounds,
          { owner: resources.sql, scope, accountSelector, classification },
        );
        retained = true;
        return prepared;
      } finally {
        if (!retained) {
          await settleUnretainedIssuerPreparationAsync(resources.sql, scope, ledger, response);
        }
      }
    },
    async prepareSessionMutation(
      request: Request,
      kind: "renew" | "logout",
      bounds: IssuerOperationBounds,
    ): Promise<PreparedIssuerOperation> {
      bounds = Object.freeze({ ...bounds });
      guard.assertMutation(request);
      assertBounds(bounds);
      const scope = beginIssuerSqlScope(resources.sql, {
        ...bounds,
        signal: AbortSignal.any([bounds.signal, request.signal]),
      });
      let retained = false;
      const ledger = new IssuerOperationLedger();
      let response: Response | null = null;
      try {
        const scoped = issuerSqlScopeResources(resources.sql, scope);
        bounds = scoped.bounds;
        await ledger.run("body", () =>
          runIssuerSqlScopeAsync(resources.sql, scope, () => bodyReader.readBytes(request, bounds)),
        );
        assertBounds(bounds);
        const admitted = await admitExistingSession(request, bounds, ledger, scope);
        if (!admitted) throw new IssuerRequestRejectedError();
        const effects: IssuerEffect[] = [];
        const witnesses: IssuerReadWitness[] = [];
        let classification: IssuerProposalContext["classification"] = { type: "write" };
        if (admitted.lease.validity.type !== "stored-session-expiry") throw new IssuerStagingError();
        bounds = Object.freeze({
          ...bounds,
          deadlineAt: Math.min(bounds.deadlineAt, admitted.lease.validity.hostDeadlineAt),
        });
        assertBounds(bounds);
        const selected = await ledger.run("selected-session", () => scoped.repository.findSession(admitted.token));
        if (
          !selected ||
          admitted.lease.validity.type !== "stored-session-expiry" ||
          selected.session.sessionToken !== admitted.token ||
          selected.session.userId !== admitted.lease.identity.userId ||
          selected.user.id !== admitted.lease.identity.userId ||
          selected.session.expires.valueOf() !== admitted.lease.validity.expiresAt
        ) {
          throw new IssuerStagingError();
        }
        const previous = snapshotIssuerSession(selected.session);
        witnesses.push({
          kind: "session",
          token: admitted.token,
          selected: { session: previous, user: snapshotIssuerUser(selected.user) },
        });
        if (kind === "logout") {
          effects.push({ kind: "delete-session", session: previous });
          response = null;
        } else {
          const dueAt =
            previous.expires.valueOf() - configuration.maxAgeSeconds * 1000 + configuration.updateAgeSeconds * 1000;
          let session = previous;
          const decidedAt = now();
          if (dueAt <= decidedAt) {
            session = { ...previous, expires: expireDateAfter(configuration.maxAgeSeconds, now) };
            effects.push({ kind: "renew-session", previous, session });
          } else classification = { type: "renew-not-due", dueAt, decidedAt };
          const prepared = prepareSessionResponse(configuration.origin.cookies, session, guard.redirect("/"));
          prepared.headers.delete("location");
          prepared.headers.set("content-type", "application/json");
          response = new Response(
            JSON.stringify({
              expires: session.expires.toISOString(),
              user: {
                id: selected.user.id,
                name: selected.user.name,
                email: selected.user.email,
                image: selected.user.image,
                colorScheme: selected.user.colorScheme,
                permissions: [...admitted.lease.identity.permissions],
              },
            }),
            { headers: prepared.headers },
          );
        }
        await ledger.run("reader-current", () =>
          admitted.lease.assertCurrentAsync({ signal: bounds.signal, deadlineAt: bounds.deadlineAt }),
        );
        assertBounds(bounds);
        const operation = retainPreparedIssuerOperation(
          kind,
          witnesses,
          effects,
          response,
          ledger,
          ["body", "selected-session", "reader-current"],
          bounds,
          { owner: resources.sql, scope, accountSelector: null, classification },
        );
        retained = true;
        return operation;
      } finally {
        if (!retained) {
          await settleUnretainedIssuerPreparationAsync(resources.sql, scope, ledger, response);
        }
      }
    },
  });
}

export type ProductionSessionIssuer = ReturnType<typeof createProductionSessionIssuer>;

export async function createProductionSqlSessionIssuer(
  runtime: PersistenceRuntime,
  configuration: ProductionSessionIssuerConfiguration,
  sqlConfiguration: AuthSessionSqlConfiguration,
  ldap: ProductionSessionIssuerResources["ldap"],
  requestApiKeys: SqlAuthorityConfiguration["apiKeys"],
  onboardingInputSource?: ProductionOnboardingRpcInputSource,
) {
  const owner = createProductionSessionSqlOwner(runtime, sqlConfiguration, requestApiKeys);
  try {
    let onboarding: ProductionOnboardingPolicy | undefined;
    if (configuration.onboarding !== undefined)
      onboarding = captureProductionOnboardingPolicy(configuration.onboarding);
    if (onboarding === undefined && onboardingInputSource !== undefined) throw new ProductionOnboardingError();
    const capturedConfiguration = Object.freeze({
      ...configuration,
      origin: Object.freeze({
        ...configuration.origin,
        cookies: Object.freeze({ ...configuration.origin.cookies }),
      }),
      providers: Object.freeze([...configuration.providers]),
      bodyBudget: Object.freeze({ ...configuration.bodyBudget }),
      onboarding,
    });
    const issuer = createProductionSessionIssuer(capturedConfiguration, { sql: owner, ldap });
    const requestConfiguration: ProductionSessionRequestConfiguration = Object.freeze({
      externalOrigin: new URL(capturedConfiguration.origin.externalBaseUrl).origin,
      cookies: capturedConfiguration.origin.cookies,
      providers: capturedConfiguration.providers,
      now: capturedConfiguration.origin.now,
    });
    const sqlIssuer = Object.freeze({
      ...issuer,
      requestConfiguration,
      executeHttpAsync: createProductionSessionHttpExecutor(owner, issuer, requestConfiguration),
      persistPreparedAsync: (prepared: PreparedIssuerOperation) => persistPreparedIssuerOperation(owner, prepared),
      discardPreparedAsync: (prepared: PreparedIssuerOperation) => discardPreparedIssuerOperation(owner, prepared),
      closeAsync: () => closeProductionSessionSqlOwner(owner),
    });
    if (onboarding !== undefined)
      configureProductionSessionSqlOnboarding(
        owner,
        sqlIssuer,
        onboarding,
        capturedConfiguration.origin,
        capturedConfiguration.providers,
        capturedConfiguration.bodyBudget,
        onboardingInputSource,
      );
    productionSqlIssuers.set(sqlIssuer, owner);
    return sqlIssuer;
  } catch (error: unknown) {
    try {
      await closeProductionSessionSqlOwner(owner);
    } catch (cleanupError: unknown) {
      throw new AggregateError([error, cleanupError], "SQL issuer construction and cleanup failed");
    }
    throw error;
  }
}

export type ProductionSqlSessionIssuer = Awaited<ReturnType<typeof createProductionSqlSessionIssuer>>;

export function createProductionOnboardingCoreController(
  issuer: ProductionSqlSessionIssuer,
  configuration: CoreConfiguration,
): ProductionOnboardingCoreController {
  const owner = productionSqlIssuers.get(issuer);
  if (!owner) throw new IssuerStagingError();
  return createProductionSessionSqlOnboardingCoreController(owner, issuer, configuration);
}

export function assertProductionOnboardingCoreController(
  issuer: ProductionSqlSessionIssuer,
  controller: ProductionOnboardingCoreController,
): void {
  const owner = productionSqlIssuers.get(issuer);
  if (!owner) throw new IssuerStagingError();
  assertProductionSessionSqlOnboardingCoreController(owner, issuer, controller);
}

export function getProductionSessionRequestReader(issuer: object) {
  const owner = productionSqlIssuers.get(issuer);
  if (!owner) throw new IssuerStagingError();
  return getProductionSessionSqlRequestReader(owner);
}

export function readProductionSessionRequestUserAsync(
  issuer: ProductionSqlSessionIssuer,
  lease: SqlAuthorityReadLease,
  operation: SqlAuthorityOperation,
): Promise<ProductionSessionRequestUser> {
  const owner = productionSqlIssuers.get(issuer);
  if (!owner) throw new IssuerStagingError();
  return readProductionSessionSqlRequestUserAsync(owner, lease, operation);
}

export function dispatchProductionBoardPermissionsAsync(
  issuer: ProductionSqlSessionIssuer,
  lease: SqlAuthorityReadLease,
  operation: SqlAuthorityOperation,
  mutation: BoardPermissionsMutation,
): Promise<void> {
  const owner = productionSqlIssuers.get(issuer);
  if (!owner) throw new IssuerStagingError();
  return dispatchProductionSessionSqlBoardPermissionsAsync(owner, lease, operation, mutation);
}

export function dispatchProductionAppCreateAsync(
  issuer: ProductionSqlSessionIssuer,
  lease: SqlAuthorityReadLease,
  operation: SqlAuthorityOperation,
  mutation: AppMutation,
): Promise<AppMutationResult> {
  const owner = productionSqlIssuers.get(issuer);
  if (!owner) throw new IssuerStagingError();
  return dispatchProductionSessionSqlAppCreateAsync(owner, lease, operation, mutation);
}

export function captureProductionOnboardingRequest(
  issuer: ProductionSqlSessionIssuer,
  request: Request,
  requestId: string,
  signal: AbortSignal,
  lifetime: AbortSignal,
): ProductionOnboardingRequest {
  const owner = productionSqlIssuers.get(issuer);
  if (!owner) throw new ProductionOnboardingError();
  return captureProductionSessionSqlOnboardingRequest(owner, issuer, request, requestId, signal, lifetime);
}

export function prepareProductionOnboardingClaimAsync(
  issuer: ProductionSqlSessionIssuer,
  handle: ProductionOnboardingRequest,
  request: Request,
): Promise<PreparedProductionOnboardingClaim> {
  const owner = productionSqlIssuers.get(issuer);
  if (!owner) throw new ProductionOnboardingError();
  return prepareProductionSessionSqlOnboardingClaimAsync(owner, issuer, handle, request);
}

export function prepareProductionOnboardNextStepAsync(
  issuer: ProductionSqlSessionIssuer,
  handle: ProductionOnboardingRequest,
  request: Request,
): Promise<PreparedProductionOnboardNextStep> {
  const owner = productionSqlIssuers.get(issuer);
  if (!owner) throw new ProductionOnboardingError();
  return prepareProductionSessionSqlOnboardNextStepAsync(owner, issuer, handle, request);
}

export function prepareProductionOnboardingInitUserAsync(
  issuer: ProductionSqlSessionIssuer,
  handle: ProductionOnboardingRequest,
  request: Request,
): Promise<PreparedProductionOnboardingInitUser> {
  const owner = productionSqlIssuers.get(issuer);
  if (!owner) throw new ProductionOnboardingError();
  return prepareProductionSessionSqlOnboardingInitUserAsync(owner, issuer, handle, request);
}

export function prepareProductionInitialExternalGroupAsync(
  issuer: ProductionSqlSessionIssuer,
  handle: ProductionOnboardingRequest,
  request: Request,
): Promise<PreparedProductionInitialExternalGroup> {
  const owner = productionSqlIssuers.get(issuer);
  if (!owner) throw new ProductionOnboardingError();
  return prepareProductionSessionSqlInitialExternalGroupAsync(owner, issuer, handle, request);
}

export function dispatchProductionOnboardingClaimAsync(
  issuer: ProductionSqlSessionIssuer,
  handle: PreparedProductionOnboardingClaim,
  request: Request,
): Promise<ProductionOnboardingClaimOutput> {
  const owner = productionSqlIssuers.get(issuer);
  if (!owner) throw new ProductionOnboardingError();
  return dispatchProductionSessionSqlOnboardingClaimAsync(owner, issuer, handle, request);
}

export function dispatchProductionOnboardNextStepAsync(
  issuer: ProductionSqlSessionIssuer,
  handle: PreparedProductionOnboardNextStep,
  request: Request,
): Promise<void> {
  const owner = productionSqlIssuers.get(issuer);
  if (!owner) throw new ProductionOnboardingError();
  return dispatchProductionSessionSqlOnboardNextStepAsync(owner, issuer, handle, request);
}

export function dispatchProductionOnboardingInitUserAsync(
  issuer: ProductionSqlSessionIssuer,
  handle: PreparedProductionOnboardingInitUser,
  request: Request,
): Promise<void> {
  const owner = productionSqlIssuers.get(issuer);
  if (!owner) throw new ProductionOnboardingError();
  return dispatchProductionSessionSqlOnboardingInitUserAsync(owner, issuer, handle, request);
}

export function dispatchProductionInitialExternalGroupAsync(
  issuer: ProductionSqlSessionIssuer,
  handle: PreparedProductionInitialExternalGroup,
  request: Request,
): Promise<void> {
  const owner = productionSqlIssuers.get(issuer);
  if (!owner) throw new ProductionOnboardingError();
  return dispatchProductionSessionSqlInitialExternalGroupAsync(owner, issuer, handle, request);
}

export function disposeProductionOnboardingRequestAsync(
  issuer: ProductionSqlSessionIssuer,
  handle: ProductionOnboardingRequest,
  request: Request,
): Promise<void> {
  const owner = productionSqlIssuers.get(issuer);
  if (!owner) throw new ProductionOnboardingError();
  return disposeProductionSessionSqlOnboardingRequestAsync(owner, issuer, handle, request);
}

function onboardingSqlOwner(issuer: ProductionSqlSessionIssuer): ProductionSessionSqlOwner {
  const owner = productionSqlIssuers.get(issuer);
  if (!owner) throw new ProductionOnboardingError();
  return owner;
}

export function getProductionOnboardingRequestBounds(
  issuer: ProductionSqlSessionIssuer,
  handle: ProductionOnboardingRequest,
  request: Request,
) {
  return getProductionSessionSqlOnboardingRequestBounds(onboardingSqlOwner(issuer), issuer, handle, request);
}

export function readProductionOnboardingRpcPacketAsync(
  issuer: ProductionSqlSessionIssuer,
  handle: ProductionOnboardingRequest,
  request: Request,
): Promise<ProductionOnboardingRpcPacket> {
  return readProductionSessionSqlOnboardingRpcPacketAsync(onboardingSqlOwner(issuer), issuer, handle, request);
}

export function resolveProductionOnboardingRpcPacketAsync(
  issuer: ProductionSqlSessionIssuer,
  packet: ProductionOnboardingRpcPacket,
  request: Request,
): Promise<unknown> {
  return resolveProductionSessionSqlOnboardingRpcPacketAsync(onboardingSqlOwner(issuer), issuer, packet, request);
}

export function createProductionOnboardingRpcFrame(
  issuer: ProductionSqlSessionIssuer,
  handle: ProductionOnboardingRequest,
  request: Request,
  packet: ProductionOnboardingRpcPacket,
  context: ProductionOnboardingRpcContext,
) {
  return createProductionSessionSqlOnboardingRpcFrame(
    onboardingSqlOwner(issuer),
    issuer,
    handle,
    request,
    packet,
    context,
  );
}

export function assertProductionOnboardingRpcFrame(
  issuer: ProductionSqlSessionIssuer,
  originalRequest: Request,
  frame: ProductionOnboardingRpcFrame,
  ticket: ProductionOnboardingInputTicket,
  packet: ProductionOnboardingRpcPacket,
  finalContext: ProductionOnboardingRpcContext,
  inputSource: ProductionOnboardingRpcInputSource,
): void {
  assertProductionSessionSqlOnboardingRpcFrame(
    onboardingSqlOwner(issuer),
    issuer,
    originalRequest,
    frame,
    ticket,
    packet,
    finalContext,
    inputSource,
  );
}

export function prepareProductionOnboardNextStepFromCodecAsync(
  issuer: ProductionSqlSessionIssuer,
  frame: ProductionOnboardingRpcFrame,
  ticket: ProductionOnboardNextStepInputTicket,
): Promise<PreparedProductionOnboardNextStep> {
  return prepareProductionSessionSqlOnboardNextStepFromCodecAsync(onboardingSqlOwner(issuer), issuer, frame, ticket);
}

export function prepareProductionOnboardingInitUserFromCodecAsync(
  issuer: ProductionSqlSessionIssuer,
  frame: ProductionOnboardingRpcFrame,
  ticket: ProductionOnboardingInitUserInputTicket,
): Promise<PreparedProductionOnboardingInitUser> {
  return prepareProductionSessionSqlOnboardingInitUserFromCodecAsync(onboardingSqlOwner(issuer), issuer, frame, ticket);
}

export function prepareProductionInitialExternalGroupFromCodecAsync(
  issuer: ProductionSqlSessionIssuer,
  frame: ProductionOnboardingRpcFrame,
  ticket: ProductionInitialExternalGroupInputTicket,
): Promise<PreparedProductionInitialExternalGroup> {
  return prepareProductionSessionSqlInitialExternalGroupFromCodecAsync(
    onboardingSqlOwner(issuer),
    issuer,
    frame,
    ticket,
  );
}

export function captureProductionOnboardingCsrfRequest(
  issuer: ProductionSqlSessionIssuer,
  request: Request,
  requestId: string,
  signal: AbortSignal,
  lifetime: AbortSignal,
): ProductionOnboardingCsrfRequest {
  return captureProductionSessionSqlOnboardingCsrfRequest(
    onboardingSqlOwner(issuer),
    issuer,
    request,
    requestId,
    signal,
    lifetime,
  );
}

export function prepareProductionOnboardingCsrfAsync(
  issuer: ProductionSqlSessionIssuer,
  handle: ProductionOnboardingCsrfRequest,
  request: Request,
): Promise<ProductionOnboardingCsrfOutput> {
  return prepareProductionSessionSqlOnboardingCsrfAsync(onboardingSqlOwner(issuer), issuer, handle, request);
}

export function disposeProductionOnboardingCsrfRequestAsync(
  issuer: ProductionSqlSessionIssuer,
  handle: ProductionOnboardingCsrfRequest,
  request: Request,
): Promise<void> {
  return disposeProductionSessionSqlOnboardingCsrfRequestAsync(onboardingSqlOwner(issuer), issuer, handle, request);
}

export function recordProductionOnboardingResponseAsync(
  issuer: ProductionSqlSessionIssuer,
  handle: ProductionOnboardingRequest | ProductionOnboardingCsrfRequest,
  request: Request,
  outcome: ProductionOnboardingResponseOutcome,
): Promise<ProductionOnboardingPublication> {
  return recordProductionSessionSqlOnboardingResponseAsync(
    onboardingSqlOwner(issuer),
    issuer,
    handle,
    request,
    outcome,
  );
}

export function readProductionOnboardingPublication(
  issuer: ProductionSqlSessionIssuer,
  handle: ProductionOnboardingPublication,
  request: Request,
  response: Response,
) {
  return readProductionSessionSqlOnboardingPublication(issuer, handle, request, response);
}

export function settleProductionOnboardingPublicationAsync(
  issuer: ProductionSqlSessionIssuer,
  handle: ProductionOnboardingPublication,
  request: Request,
  response: Response,
  terminal: { readonly kind: "published" } | { readonly kind: "abandoned"; readonly cause: unknown },
): Promise<ProductionOnboardingPublicationResult> {
  return settleProductionSessionSqlOnboardingPublicationAsync(
    onboardingSqlOwner(issuer),
    issuer,
    handle,
    request,
    response,
    terminal,
  );
}
