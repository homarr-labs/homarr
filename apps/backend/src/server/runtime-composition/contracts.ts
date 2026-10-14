import type { RequestContext, ResponseEffect } from "@homarr/contracts/request";
import type {
  ProductionOnboardingRequest,
  ProductionOnboardingPublicationResult,
  ProductionOnboardingRpcCommand,
  dispatchProductionAppCreateAsync,
  dispatchProductionBoardPermissionsAsync,
  ProductionSessionApiKeyConfiguration,
  ProductionSessionIssuerConfiguration,
  ProductionSessionLdapResources,
  ProductionSessionRequestUser,
} from "@homarr/auth/nitro/production-sessions";
import type { AuthSessionSqlConfiguration } from "@homarr/db/runtime-auth-session";
import type {
  AuthHttpPublicationProducer,
  FetchContribution,
  FetchOutcome,
  OnboardingHttpPublicationEndpoint,
  OnboardingHttpPublicationHandle,
  OnboardingHttpPublicationProducer,
} from "@homarr/contracts/contribution";
import type { SetupReadAdmission } from "@homarr/api/nitro/resources/setup-read";
import type {
  OnboardingRpcRequestResult,
  OwnedOnboardingRpcRequestController,
} from "@homarr/api/nitro/assembly/onboarding-wire";

import type { AuthenticatedRequestConfiguration, AuthenticatedRequestResources } from "./auth";

export type FixedWriteLeaf = "app.create" | "board.saveUserBoardPermissions" | "board.saveGroupBoardPermissions";

export interface MainFixedWriteDispatch {
  dispatchBoardPermissionsAsync(
    lease: Parameters<typeof dispatchProductionBoardPermissionsAsync>[1],
    operation: Parameters<typeof dispatchProductionBoardPermissionsAsync>[2],
    mutation: Parameters<typeof dispatchProductionBoardPermissionsAsync>[3],
  ): ReturnType<typeof dispatchProductionBoardPermissionsAsync>;
  dispatchAppCreateAsync(
    lease: Parameters<typeof dispatchProductionAppCreateAsync>[1],
    operation: Parameters<typeof dispatchProductionAppCreateAsync>[2],
    mutation: Parameters<typeof dispatchProductionAppCreateAsync>[3],
  ): ReturnType<typeof dispatchProductionAppCreateAsync>;
}

export interface FixedWriteRequestBinding {
  saveBoardPermissionsAsync(
    mutation: Parameters<MainFixedWriteDispatch["dispatchBoardPermissionsAsync"]>[2],
  ): ReturnType<MainFixedWriteDispatch["dispatchBoardPermissionsAsync"]>;
  createAppAsync(
    mutation: Parameters<MainFixedWriteDispatch["dispatchAppCreateAsync"]>[2],
  ): ReturnType<MainFixedWriteDispatch["dispatchAppCreateAsync"]>;
  runHandlerAsync(handle: () => Promise<Response>): Promise<Response>;
}

export interface FixedWriteRpcConstructionInput {
  readonly path: `/${string}`;
  readonly baseUrl: PublicBackendInput["baseUrl"];
  readonly createId: () => string;
  readonly maximumRequestBytes: number;
  readonly maximumResponseBytes: number;
}

export interface FixedWriteRpcResources extends FixedWriteRpcConstructionInput {
  readonly requests: AuthenticatedRequestResources;
  assertCurrent(): void;
  runRequestAsync(handle: () => Promise<Response>): Promise<Response>;
  runSetupScopeAsync(
    signal: AbortSignal,
    handle: (admission: SetupReadAdmission) => Promise<Response>,
  ): Promise<Response>;
}

export interface FixedWriteRpcConstructor {
  createFixedWriteRpc(input: FixedWriteRpcConstructionInput): readonly FetchContribution[];
}

export interface MainOnboardingScope {
  readonly ready: Promise<SetupReadAdmission>;
  readonly task: Promise<void>;
  readonly work: Set<Promise<unknown>>;
  readonly disposers: Set<() => void | Promise<void>>;
  controller: OwnedOnboardingRpcRequestController | undefined;
  delegated: boolean;
  assertCurrent(): void;
  release(): void;
  stop(reason: unknown): void;
  readFailure(): {
    readonly primary: { readonly kind: "none" } | { readonly kind: "failed"; readonly error: unknown };
    readonly cleanup: readonly unknown[];
  };
  closeAsync(): Promise<void>;
}

export interface MainOnboardingScopeResources {
  reserveScope(
    context: RequestContext,
    original: ProductionOnboardingRequest,
    factory: Promise<unknown>,
  ): MainOnboardingScope;
}

export interface OwnedOnboardingBackendRequest {
  executeAsync(): Promise<OnboardingRpcRequestResult>;
  closeAsync(): Promise<void>;
}

export interface OnboardingWireConstructionInput {
  readonly path: "/rpc";
  readonly basePath: "";
  readonly baseUrl: PublicBackendInput["baseUrl"];
}

export type OnboardingWireEndpoint = OnboardingHttpPublicationEndpoint;

export interface OnboardingPublicationHandle extends OnboardingHttpPublicationHandle {
  read(): OnboardingRpcRequestResult["finite"];
  finishAsync(): Promise<ProductionOnboardingPublicationResult>;
  abandonAsync(cause: unknown): Promise<ProductionOnboardingPublicationResult>;
}

export interface OnboardingPublicationProducer extends OnboardingHttpPublicationProducer {
  claim(context: RequestContext, response: Response): OnboardingPublicationHandle;
  abandonAsync(
    context: RequestContext,
    response: Response,
    cause: unknown,
  ): Promise<ProductionOnboardingPublicationResult>;
}

export interface OwnedOnboardingWireController {
  readonly routes: readonly FetchContribution[];
  readonly endpoints: readonly OnboardingWireEndpoint[];
  readonly publication: OnboardingPublicationProducer;
  closeAsync(): Promise<void>;
}

export interface OnboardingWireConstructor {
  createOnboardingWire(input: OnboardingWireConstructionInput): OwnedOnboardingWireController;
  assertOnboardingWireController(controller: OwnedOnboardingWireController): void;
}

export interface OnboardingWireRequestOwner {
  executeRpcAsync(context: RequestContext, command: ProductionOnboardingRpcCommand): Promise<FetchOutcome>;
  executeClaimAsync(context: RequestContext): Promise<FetchOutcome>;
}

export interface AuthHttpConstructionInput {
  readonly baseUrl: PublicBackendInput["baseUrl"];
  readonly basePath: "";
  readonly maximumResponseBytes: number;
}

export interface AuthHttpController extends AuthHttpPublicationProducer {
  handle(context: RequestContext): Promise<FetchOutcome>;
}

export interface AuthenticatedReadConstructionInput {
  readonly issuer: ProductionSessionIssuerConfiguration;
  readonly sql: Omit<AuthSessionSqlConfiguration, "lifetime">;
  readonly ldap: ProductionSessionLdapResources;
  readonly apiKeys: ProductionSessionApiKeyConfiguration;
  readonly requestDeadlineMs: number;
  readonly demo: AuthenticatedRequestConfiguration["demo"];
  readonly readAccess: AuthenticatedRequestConfiguration["readAccess"];
}

export type HostAuthenticationInput =
  | { readonly kind: "public-only" }
  | {
      readonly kind: "authenticated-read";
      readonly construction: AuthenticatedReadConstructionInput;
      readonly version: string;
      readonly createId: () => string;
      readonly oidcGroupsLocalManagement: boolean;
      readonly maximumResponseBytes: number;
    };

export interface MainPersistenceConfig {
  readonly engine: "sqlite";
  readonly path: string;
  readonly mode: "fresh" | "existing";
  readonly migrationsFolder: string;
  readonly epochInitializationTimeoutMs: number;
}

export type MainPersistencePhase =
  | "configured"
  | "opening"
  | "open"
  | "migrating"
  | "schema-ready"
  | "ready"
  | "maintenance"
  | "closing"
  | "closed"
  | "failed";

export interface AdmissionRuntime<Database, Schema> {
  readonly engine: "sqlite" | "postgresql";
  readonly phase: MainPersistencePhase;
  runAsync<Value>(operation: (database: Database, schema: Schema) => Value | Promise<Value>): Promise<Value>;
}

export interface MainPersistenceRuntime<Database, Schema> extends AdmissionRuntime<Database, Schema> {
  openAsync(): Promise<void>;
  migrateSchemaAsync(): Promise<void>;
  migrateContentAsync(options?: { initializeFreshAsync?: (database: Database) => Promise<void> }): Promise<void>;
  checkReadinessAsync(): Promise<{ engine: "sqlite" | "postgresql"; phase: MainPersistencePhase; ready: boolean }>;
  closeAsync(): Promise<void>;
}

export interface PublicQueryDatabase {
  readonly query: {
    readonly users: {
      findFirst(options: { columns: { id: true } }): PromiseLike<{ id: string } | undefined>;
    };
    readonly onboarding: {
      findFirst(): PromiseLike<{ step: string | null } | undefined>;
    };
  };
}

export interface ProxySettingsReader {
  closeAsync(): Promise<void>;
  getOnboardingStepAsync(): Promise<string>;
  getDefaultLocaleAsync(): Promise<string>;
}

export interface PublicSettingsShape {
  culture: { defaultLocale: string };
  appearance: { defaultColorScheme: "light" | "dark" | "auto" };
  board: {
    homeBoardId: string | null;
    mobileHomeBoardId: string | null;
    enableStatusByDefault: boolean;
    forceDisableStatus: boolean;
  };
  search: { defaultSearchEngineId: string | null };
  user: { enableGravatar: boolean };
  branding: object;
}

export interface SettingsReader<Database, Settings extends PublicSettingsShape> {
  read<Key extends keyof Settings>(database: Database, key: Key): Promise<Settings[Key]>;
}

export interface PublicBackendInput {
  readonly request: Request;
  readonly signal: AbortSignal;
  readonly principal:
    | { readonly kind: "anonymous" }
    | { readonly kind: "authenticated"; readonly user: ProductionSessionRequestUser };
  readonly deviceType: undefined;
  readonly baseUrl: `${string}://${string}`;
  readonly demo: { readonly enabled: boolean; readonly readOnly: boolean };
  effect(effect: ResponseEffect): void;
  onDispose(dispose: () => void | Promise<void>): void;
}

export interface BackendAdmission<Database, Schema> {
  readonly database: Database;
  readonly schema: Schema;
  readonly signal: AbortSignal;
  assertCurrent(): void;
}

export interface PublicBackendContext<Database> {
  readonly db: Database;
  readonly request: Request;
  readonly signal: AbortSignal;
  readonly principal: { readonly kind: "anonymous" } | { readonly kind: "authenticated"; readonly user: object };
  readonly demo: { readonly enabled: boolean; readonly readOnly: boolean };
  readonly deviceType: "console" | "mobile" | "tablet" | "smarttv" | "wearable" | "embedded" | undefined;
  readonly baseUrl?: `${string}://${string}`;
  readonly onboardingClaimToken?: string;
  readonly setup: {
    isClaimOnlyAccessAllowed(database: Database, claimToken: string | undefined): Promise<boolean>;
    currentStep(database: Database): Promise<"start" | "user" | "group" | "setup" | "finish">;
  };
  effect(effect: ResponseEffect): void;
  onDispose(dispose: () => void | Promise<void>): void;
}

export interface ResolvedPublicLocale<Locale extends string> {
  catalogLocale: Locale;
  intlLocale: string;
  direction: "rtl" | "ltr";
  source: "explicit" | "cookie" | "configuration" | "fallback";
  defaultLocale: Locale;
  cookieLocale: string | undefined;
}

export interface PublicLocaleCookie<Locale extends string> {
  kind: "cookie";
  name: string;
  value: Locale;
  options: { maxAge: number; sameSite: "lax"; path: string };
}

export interface PublicCultureOptions {
  readonly now?: Date;
  readonly timeZone?: string;
  readonly formats?: unknown;
}

export interface CultureFactories<
  Locale extends string,
  Options extends PublicCultureOptions,
  Culture,
  Preferences,
  Formatter,
> {
  readonly supportedLanguages: readonly Locale[];
  resolveRequestLocale(
    resources: { preferences: { get(name: string): string | undefined }; readDefaultLocale(): Promise<string> },
    explicitLocale?: string,
  ): Promise<ResolvedPublicLocale<Locale>>;
  loadRequestCulture(resolved: ResolvedPublicLocale<Locale>, options: Options): Promise<Culture>;
  resolveCulturePreferences(user: null): Preferences;
  createCultureFormatter(culture: Culture, preferences: Preferences, clock: { now(): number }): Formatter;
  syncLocalePreference(
    resolved: ResolvedPublicLocale<Locale>,
    basePath: string,
    effect: (value: PublicLocaleCookie<Locale>) => void,
  ): void;
  createLocaleCookieEffect(locale: Locale, basePath: string): PublicLocaleCookie<Locale>;
}

export interface CookieCodec {
  parse(value: string): Record<string, string | undefined>;
  serialize(
    name: string,
    value: string,
    options: { maxAge: number; sameSite: "lax"; path: string; secure?: boolean },
  ): string;
}

export interface PublicHostConfiguration {
  readonly baseUrl: `${string}://${string}`;
  readonly basePath: string;
  readonly persistence: MainPersistenceConfig;
  readonly localeMutationBodyLimit: number;
}
