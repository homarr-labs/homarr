import { walkProcedureContractsSync } from "@orpc/server";
import type { AnyProcedure, AnyRouter, Context, Router } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

import type { FetchContribution } from "@homarr/contracts/contribution";
import type { AdmissionRuntime, BackendAdmission, PublicBackendContext, PublicBackendInput } from "./contracts";
import type { AuthenticatedRequestResources } from "./auth";
import {
  prepareAuthenticatedRpcRequestAsync,
  prepareFiniteRpcRequestAsync,
  readFiniteRpcResponseAsync,
} from "./authenticated-rpc";

export const publicBackendLeaves = Object.freeze(["serverSettings.getCulture", "serverSettings.getBranding"] as const);

export interface BackendRegistry<TRouter extends AnyRouter> {
  readonly revision: "homarr.backend.source-port.v2";
  readonly id: string;
  readonly router: TRouter;
  readonly leaves: readonly string[];
}

interface PublicProcedureDescriptor {
  readonly path: string;
  readonly kind: string;
  readonly access: { readonly kind: string };
  readonly demo: string;
}

type WalkedProcedure = Parameters<Parameters<typeof walkProcedureContractsSync>[1]>[0];

export function createPublicBackendRegistry<
  Resources,
  Procedures extends { readonly getCulture: AnyProcedure; readonly getBranding: AnyProcedure },
>(options: {
  readonly resources: Resources;
  createServerSettingsProcedures(resources: Resources): Procedures;
  defineBackendContribution<TRouter extends AnyRouter>(contribution: {
    readonly revision: "homarr.backend.source-port.v2";
    readonly id: string;
    readonly router: TRouter;
    readonly leaves: typeof publicBackendLeaves;
  }): BackendRegistry<TRouter>;
  getSourceProcedureMeta(procedure: WalkedProcedure): PublicProcedureDescriptor | undefined;
}) {
  const { getCulture, getBranding } = options.createServerSettingsProcedures(options.resources);
  const contribution = options.defineBackendContribution({
    revision: "homarr.backend.source-port.v2",
    id: "public-server-settings",
    router: Object.freeze({ serverSettings: Object.freeze({ getCulture, getBranding }) }),
    leaves: publicBackendLeaves,
  });
  assertPublicBackendRegistry(contribution, options.getSourceProcedureMeta);
  return Object.freeze({ ...contribution, leaves: Object.freeze([...contribution.leaves]) });
}

export function assertPublicBackendRegistry<TRouter extends AnyRouter>(
  contribution: BackendRegistry<TRouter>,
  getSourceProcedureMeta: (procedure: WalkedProcedure) => PublicProcedureDescriptor | undefined,
): void {
  if (
    contribution.revision !== "homarr.backend.source-port.v2" ||
    contribution.leaves.length !== publicBackendLeaves.length ||
    new Set(contribution.leaves).size !== publicBackendLeaves.length ||
    publicBackendLeaves.some((leaf) => !contribution.leaves.includes(leaf))
  ) {
    throw new Error("Public backend registry must contain exactly the two accepted settings leaves");
  }
  const registered = new Set<string>();
  const lazy = walkProcedureContractsSync(contribution.router, (procedure, path) => {
    const descriptor = getSourceProcedureMeta(procedure);
    if (
      !descriptor ||
      descriptor.path !== path.join(".") ||
      !contribution.leaves.includes(descriptor.path) ||
      descriptor.access.kind !== "public" ||
      descriptor.kind !== "query" ||
      descriptor.demo !== "guarded" ||
      registered.has(descriptor.path)
    ) {
      throw new Error("Public backend registry contains an unaccepted source policy or identity");
    }
    registered.add(descriptor.path);
  });
  if (lazy.length > 0 || registered.size !== publicBackendLeaves.length) {
    throw new Error("Public backend registry must be explicit and complete");
  }
}

export function createAdmittedPublicRpc<
  Database,
  Schema,
  Backend extends Context & PublicBackendContext<Database>,
  SetupResources,
>(options: {
  readonly contribution: BackendRegistry<Router<Backend>>;
  readonly runtime: AdmissionRuntime<Database, Schema>;
  readonly schema: Schema;
  readonly path: `/${string}`;
  readonly baseUrl: `${string}://${string}`;
  readonly setupResources: SetupResources;
  readonly authentication:
    | { readonly kind: "public-only" }
    | {
        readonly kind: "authenticated-read";
        readonly requests: AuthenticatedRequestResources;
        readonly maximumResponseBytes: number;
        readonly maximumRequestBytes: number;
      };
  getSourceProcedureMeta(procedure: WalkedProcedure): PublicProcedureDescriptor | undefined;
  createSetupBackedContext(
    input: PublicBackendInput,
    admission: BackendAdmission<Database, Schema>,
    resources: SetupResources,
  ): Backend;
  assertCurrent(): void;
}): FetchContribution {
  assertPublicBackendRegistry(options.contribution, options.getSourceProcedureMeta);
  const handler = new RPCHandler(options.contribution.router, { allowMethods: ["POST"] });
  const paths = publicBackendLeaves.map((leaf) => `${options.path}/${leaf.replaceAll(".", "/")}`);
  return Object.freeze({
    phase: "rpc",
    path: options.path,
    descendants: true,
    access: { kind: "public" },
    async handle(context) {
      if (!paths.includes(new URL(context.request.url).pathname)) return { kind: "pass" };
      if (context.request.method !== "POST") {
        return { kind: "response", response: new Response(null, { status: 405, headers: { allow: "POST" } }) };
      }
      context.signal.throwIfAborted();
      let authenticated: Awaited<ReturnType<typeof prepareAuthenticatedRpcRequestAsync>> | undefined;
      let principal: PublicBackendInput["principal"] = { kind: "anonymous" };
      let demo: PublicBackendInput["demo"] = { enabled: false, readOnly: false };
      let maximumResponseBytes = Number.MAX_SAFE_INTEGER;
      if (options.authentication.kind === "authenticated-read") {
        demo = options.authentication.requests.configuration.demo;
        maximumResponseBytes = options.authentication.maximumResponseBytes;
      }
      if (context.principal.kind === "authenticated") {
        if (options.authentication.kind !== "authenticated-read")
          throw new Error("Public RPC authority is unavailable");
        authenticated = await prepareAuthenticatedRpcRequestAsync(
          context,
          options.authentication.requests,
          options.assertCurrent,
        );
        principal = authenticated.principal;
      }
      const signal = authenticated?.signal ?? context.signal;
      options.assertCurrent();
      if (options.runtime.engine !== "sqlite") throw new Error("Public RPC requires the selected SQLite engine");
      let ownedResponse: Response | undefined;
      try {
        const outcome = await options.runtime.runAsync(async (database, schema) => {
          if (schema !== options.schema)
            throw new Error("RPC procedures and admission must use the same physical schema");
          let active = true;
          const assertCurrent = () => {
            signal.throwIfAborted();
            authenticated?.assertCurrent();
            if (!active) throw new Error("Backend SQL admission has expired");
            options.assertCurrent();
          };
          try {
            assertCurrent();
            const backend = options.createSetupBackedContext(
              {
                request: context.request,
                signal,
                principal,
                deviceType: undefined,
                baseUrl: options.baseUrl,
                demo,
                effect: (effect) => {
                  assertCurrent();
                  context.effect(effect);
                },
                onDispose: (dispose) => {
                  assertCurrent();
                  context.onDispose(dispose);
                },
              },
              { database, schema, signal, assertCurrent },
              options.setupResources,
            );
            if (
              backend.db !== database ||
              backend.request !== context.request ||
              backend.signal !== signal ||
              backend.principal.kind !== principal.kind ||
              backend.deviceType !== undefined ||
              backend.baseUrl !== options.baseUrl ||
              backend.demo.enabled !== demo.enabled ||
              backend.demo.readOnly !== demo.readOnly ||
              !Object.isFrozen(backend) ||
              !Object.isFrozen(backend.principal) ||
              !Object.isFrozen(backend.demo) ||
              !Object.isFrozen(backend.setup) ||
              typeof backend.setup.isClaimOnlyAccessAllowed !== "function" ||
              typeof backend.setup.currentStep !== "function"
            ) {
              throw new Error("Public backend context does not match its admitted resources");
            }
            if (backend.principal.kind === "authenticated" && principal.kind === "authenticated") {
              if (!("id" in backend.principal.user) || backend.principal.user.id !== principal.user.id)
                throw new Error("Public RPC principal does not match actual authority");
            }
            let transportRequest = context.request;
            if (options.authentication.kind === "authenticated-read") {
              transportRequest = await prepareFiniteRpcRequestAsync(
                context.request,
                signal,
                options.authentication.maximumRequestBytes,
              );
              assertCurrent();
            }
            const result = await handler.handle(transportRequest, { prefix: options.path, context: backend });
            if (!result.matched) {
              assertCurrent();
              return { kind: "response" as const, response: new Response(null, { status: 404 }) };
            }
            const response = result.response;
            ownedResponse = response;
            try {
              const finite = await readFiniteRpcResponseAsync(response, signal, maximumResponseBytes);
              ownedResponse = finite;
              if (authenticated) await authenticated.assertCurrentAsync();
              assertCurrent();
              return {
                kind: "response" as const,
                response: finite,
              };
            } catch (error) {
              try {
                if (response.body && !response.body.locked) await response.body.cancel(error);
              } catch (cancellationError) {
                throw new AggregateError(
                  [error, cancellationError],
                  "RPC serialization and response cancellation failed",
                );
              }
              throw error;
            }
          } finally {
            active = false;
          }
        });
        if (authenticated) await authenticated.assertCurrentAsync();
        signal.throwIfAborted();
        options.assertCurrent();
        return outcome;
      } catch (error) {
        try {
          if (ownedResponse?.body && !ownedResponse.body.locked) await ownedResponse.body.cancel(error);
        } catch (cleanupError) {
          throw new AggregateError([error, cleanupError], "Public RPC output and cleanup failed");
        }
        throw error;
      }
    },
  } satisfies FetchContribution);
}
