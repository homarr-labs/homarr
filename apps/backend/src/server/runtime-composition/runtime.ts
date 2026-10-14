import { parseCookie, stringifySetCookie } from "cookie";

import { getSourceProcedureMeta } from "@homarr/api/nitro";
import { defineBackendContribution } from "@homarr/api/nitro/contribution";
import { createAuthenticatedReadAssembly } from "@homarr/api/nitro/assembly/authenticated-read";
import { createNativeReadResources } from "@homarr/api/nitro/assembly/native-read-resources";
import { createSettingsStore, settingsCodec } from "@homarr/api/nitro/helpers/settings";
import { createSetupBackedContext } from "@homarr/api/nitro/resources/setup-read";
import { createServerSettingsProcedures } from "@homarr/api/nitro/routers/server-settings";
import type { FetchContribution } from "@homarr/contracts/contribution";
import type { RequestContext } from "@homarr/contracts/request";
import { and, eq, inArray } from "@homarr/db";
import { supportedLanguages } from "@homarr/translation/languages";
import {
  createCultureFormatter,
  createLocaleCookieEffect,
  loadRequestCulture,
  resolveCulturePreferences,
  resolveRequestLocale,
  syncLocalePreference,
} from "@homarr/translation/runtime";
import { assemblePublicResourceHost } from "./assembly";
import { createAdmittedAuthenticatedRpc } from "./authenticated-rpc";
import { captureHostConfiguration, hostPath } from "./configuration";
import type {
  HostAuthenticationInput,
  OwnedOnboardingWireController,
  PublicCultureOptions,
  PublicHostConfiguration,
  PublicSettingsShape,
} from "./contracts";
import { createNativeMainPersistenceResourcesAsync } from "./native-main-persistence";
import { createPublicCultureResources } from "./public-culture";
import { createAdmittedPublicRpc, createPublicBackendRegistry } from "./public-rpc";
import { createPublicSqlSettings } from "./public-settings";

type MainPersistence = Awaited<ReturnType<typeof createNativeMainPersistenceResourcesAsync>>;
type MainOperation = Parameters<MainPersistence["runAsync"]>[0];
type MainDatabase = Parameters<MainOperation>[0];
type MainSchema = Parameters<MainOperation>[1];
type SettingsResources = Parameters<typeof createSettingsStore>[0];
type CultureOptions = NonNullable<Parameters<typeof loadRequestCulture>[1]>;

type SqlProjection<Database, Schema, Settings extends PublicSettingsShape, Resources> = Awaited<
  ReturnType<ReturnType<typeof createPublicSqlSettings<Database, Schema, Settings, Resources>>["readAsync"]>
>;

export type PublicHostPreparation<
  Locale extends string,
  Options extends PublicCultureOptions,
  Culture,
  Preferences,
  Formatter,
  Settings extends { readonly appearance: { readonly defaultColorScheme: "light" | "dark" | "auto" } },
> = Awaited<
  ReturnType<
    ReturnType<
      typeof createPublicCultureResources<Locale, Options, Culture, Preferences, Formatter, Settings>
    >["prepareAsync"]
  >
>;

type PreparedPublicHost = PublicHostPreparation<
  (typeof supportedLanguages)[number],
  CultureOptions,
  Awaited<ReturnType<typeof loadRequestCulture>>,
  ReturnType<typeof resolveCulturePreferences>,
  ReturnType<typeof createCultureFormatter>,
  SqlProjection<MainDatabase, MainSchema, PublicSettingsShape, SettingsResources>
>;

export async function createPublicHostRuntime(options: {
  readonly configuration: PublicHostConfiguration;
  readonly startupSignal: AbortSignal;
  readonly authentication: HostAuthenticationInput;
  cultureOptions(context: RequestContext): CultureOptions;
  render(context: RequestContext, prepared: PreparedPublicHost): Promise<Response>;
  reportError(error: unknown, requestId: string): void;
}) {
  const configuration = captureHostConfiguration(options.configuration);
  options.startupSignal.throwIfAborted();
  const persistence = await createNativeMainPersistenceResourcesAsync(configuration.persistence);
  let onboardingController: OwnedOnboardingWireController | undefined;
  try {
    options.startupSignal.throwIfAborted();
    await persistence.ready(options.startupSignal);
    let authentication: Parameters<typeof assemblePublicResourceHost>[0]["authentication"] = { kind: "public-only" };
    let rpcAuthentication: Parameters<typeof createAdmittedPublicRpc>[0]["authentication"] = { kind: "public-only" };
    let requests: Awaited<ReturnType<typeof persistence.createAuthenticatedReadResourcesAsync>> | undefined;
    if (options.authentication.kind === "authenticated-read") {
      if (new URL(options.authentication.construction.issuer.origin.externalBaseUrl).origin !== configuration.baseUrl)
        throw new Error("Authentication origin must match the captured host origin");
      requests = await persistence.createAuthenticatedReadResourcesAsync(options.authentication.construction);
    }
    const schema = await persistence.runAsync((_database, schema) => schema);
    if (options.authentication.kind === "authenticated-read") {
      if (!requests) throw new Error("Authentication request resources are unavailable");
      const providers = Object.freeze({
        enabled: requests.configuration.providers,
        oidcGroupsLocalManagement: options.authentication.oidcGroupsLocalManagement,
      });
      const reads = createAuthenticatedReadAssembly(
        createNativeReadResources({
          schema,
          version: options.authentication.version,
          createId: options.authentication.createId,
          providers: () => providers,
        }),
      );
      if (configuration.basePath !== "")
        throw new Error("Authentication HTTP requires an empty captured host base path");
      const authHttpController = persistence.createAuthHttpController({
        baseUrl: configuration.baseUrl,
        basePath: configuration.basePath,
        maximumResponseBytes: options.authentication.maximumResponseBytes,
      });
      const authHttpPaths = Object.freeze<FetchContribution["path"][]>([
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
      const authHttpRoutes = Object.freeze(
        authHttpPaths.map((path): FetchContribution => {
          return Object.freeze({
            phase: "auth",
            path,
            descendants: false,
            access: Object.freeze({ kind: "public" }),
            handle: authHttpController.handle,
          });
        }),
      );
      const fixedWrites = persistence.createFixedWriteRpc({
        path: hostPath(configuration, "/rpc"),
        baseUrl: configuration.baseUrl,
        createId: options.authentication.createId,
        maximumRequestBytes: options.authentication.construction.issuer.bodyBudget.maximumBytes,
        maximumResponseBytes: options.authentication.maximumResponseBytes,
      });
      onboardingController = persistence.createOnboardingWire({
        path: "/rpc",
        basePath: "",
        baseUrl: configuration.baseUrl,
      });
      persistence.assertOnboardingWireController(onboardingController);
      authentication = {
        kind: "authenticated-read",
        requests,
        fixedWrites,
        authHttpController,
        authHttpRoutes,
        authHttpOwner: persistence,
        onboardingController,
        rpc: createAdmittedAuthenticatedRpc({
          contribution: reads,
          runtime: persistence.runtime,
          schema,
          requests,
          path: hostPath(configuration, "/rpc"),
          baseUrl: configuration.baseUrl,
          maximumResponseBytes: options.authentication.maximumResponseBytes,
          maximumRequestBytes: options.authentication.construction.issuer.bodyBudget.maximumBytes,
          assertCurrent: persistence.assertCurrent,
        }),
      };
      rpcAuthentication = {
        kind: "authenticated-read",
        requests,
        maximumResponseBytes: options.authentication.maximumResponseBytes,
        maximumRequestBytes: options.authentication.construction.issuer.bodyBudget.maximumBytes,
      };
    }
    const settingsResources: SettingsResources = {
      serverSettings: schema.serverSettings,
      operators: { eq, and },
      codec: settingsCodec,
    };
    const registry = createPublicBackendRegistry({
      resources: { ...settingsResources, boards: schema.boards, inArray },
      createServerSettingsProcedures,
      defineBackendContribution,
      getSourceProcedureMeta,
    });
    const settings = createPublicSqlSettings({
      runtime: persistence.runtime,
      proxyReader: persistence.proxyReader,
      createSettingsStore,
      settingsResources(admittedSchema) {
        if (admittedSchema !== schema) throw new Error("Settings readers must use the main admitted physical schema");
        return settingsResources;
      },
      assertCurrent: persistence.assertCurrent,
    });
    const culture = createPublicCultureResources({
      factories: {
        supportedLanguages,
        resolveRequestLocale,
        loadRequestCulture,
        resolveCulturePreferences,
        createCultureFormatter,
        syncLocalePreference,
        createLocaleCookieEffect,
      },
      cookies: {
        parse: parseCookie,
        serialize: (name, value, attributes) => stringifySetCookie({ ...attributes, name, value }),
      },
      colorSchemeCookieKey: "homarr.color-scheme",
      snapshotOptions(context, capturedNow) {
        return { ...options.cultureOptions(context), now: new Date(capturedNow) };
      },
      now: Date.now,
      configuration,
      proxyReader: persistence.proxyReader,
      readSettingsAsync: settings.readAsync,
      assertCurrent: persistence.assertCurrent,
    });
    const rpc = createAdmittedPublicRpc({
      contribution: registry,
      runtime: persistence.runtime,
      schema,
      path: hostPath(configuration, "/rpc"),
      baseUrl: configuration.baseUrl,
      authentication: rpcAuthentication,
      setupResources: { operators: { eq }, now: Date.now },
      createSetupBackedContext,
      getSourceProcedureMeta,
      assertCurrent: persistence.assertCurrent,
    });
    persistence.assertCurrent();
    return assemblePublicResourceHost({
      configuration,
      persistence,
      settings,
      culture,
      rpc,
      authentication,
      render: options.render,
      reportError: options.reportError,
    });
  } catch (error: unknown) {
    const cleanup = Promise.withResolvers<void>();
    void cleanup.promise.catch(() => undefined);
    const close = async () => {
      const cleanupErrors: unknown[] = [];
      if (onboardingController) {
        try {
          await onboardingController.closeAsync();
        } catch (cleanupError: unknown) {
          if (cleanupError !== error && !cleanupErrors.includes(cleanupError)) cleanupErrors.push(cleanupError);
        }
      }
      try {
        await persistence.dispose();
      } catch (cleanupError: unknown) {
        if (cleanupError !== error && !cleanupErrors.includes(cleanupError)) cleanupErrors.push(cleanupError);
      }
      if (cleanupErrors.length > 0)
        throw new AggregateError([error, ...cleanupErrors], "Public host construction and cleanup failed", {
          cause: error,
        });
    };
    const forwarding = Promise.resolve().then(close).then(cleanup.resolve, cleanup.reject);
    void forwarding.catch(cleanup.reject);
    await cleanup.promise;
    throw error;
  }
}
