import { createRouterClient, Lazy, os, ORPCError, ValidationError } from "@orpc/server";
import type {
  AnyRouter,
  AnySchema,
  DecoratedProcedure,
  InferSchemaInput,
  InferSchemaOutput,
  InitialInputSchema,
  InitialOutputSchema,
  MergedContext,
  Middleware,
  ORPCErrorCode,
  ProcedureHandler,
  RouterClient,
  Schema,
} from "@orpc/server";

import { ZodError } from "zod/v4";

import type { Session } from "@homarr/auth";
import { extractBaseUrlFromHeaders, FlattenError } from "@homarr/common";
import { resolveRequestIdentity, userAgent } from "@homarr/common/server";
import type { DeviceType, RequestIdentity } from "@homarr/common/server";
import { db } from "@homarr/db";
import type { GroupPermissionKey, OnboardingStep } from "@homarr/definitions";

import { env } from "./env";
import { getOnboardingClaimTokenFromCookieHeader, isClaimOnlyOnboardingAccessAllowedAsync } from "./onboarding-claim";
import { getOnboardingOrFallbackAsync } from "./router/onboard/onboard-queries";
import type { McpMeta } from "./mcp-tools";

export interface ApiContext {
  session: Session | null;
  deviceType: DeviceType;
  baseUrl?: `${string}://${string}`;
  onboardingClaimToken?: string;
  requestIdentity?: RequestIdentity;
  db: typeof db;
  workerAccess?: {
    role: "owner" | "viewer" | "service" | "user";
    grantId: string;
    workerId?: string;
    service?: {
      integrationIds: readonly string[];
      access: "query" | "interact" | "full";
      procedurePaths: readonly string[];
      audience: string;
      principalId: string;
      organizationId?: string;
      purpose?: "mcp" | "federation";
    };
    authorizeProcedure: (input: {
      path: string;
      kind: ApiOperation;
      integrationIds?: string[];
      input?: unknown;
    }) => void | Promise<void>;
    projectResult?: (input: { path: string; input: unknown; result: unknown }) => unknown | Promise<unknown>;
  };
}

export const createApiContext = (opts: { headers: Headers; session: Session | null }): ApiContext => ({
  session: opts.session,
  deviceType: userAgent(opts.headers).device.type,
  baseUrl: extractBaseUrlFromHeaders(opts.headers),
  onboardingClaimToken: getOnboardingClaimTokenFromCookieHeader(opts.headers.get("cookie")),
  requestIdentity: resolveRequestIdentity(opts.headers),
  db,
});

/** Domain errors use native oRPC codes on every transport. */
export class ApiError extends ORPCError<ORPCErrorCode, unknown> {
  constructor(options: { code: ORPCErrorCode; message?: string; cause?: unknown; data?: unknown }) {
    let data = options.data;
    if (data === undefined && options.cause instanceof ZodError) {
      data = { zodError: options.cause.flatten(), error: null };
    }
    if (data === undefined && options.cause instanceof FlattenError) {
      data = { zodError: null, error: options.cause.flatten() };
    }
    super(options.code, { ...options, data });
  }
}

export type ApiOperation = "query" | "mutation" | "subscription";
export interface ApiMeta extends McpMeta {
  integration?: { action: "query" | "interact" | "full"; cardinality: "one" | "many" };
  operationType?: ApiOperation;
  openapi?: {
    method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    path: string;
    tags?: string[];
    protect?: boolean;
    summary?: string;
    description?: string;
    enabled?: boolean;
    deprecated?: boolean;
    contentTypes?: string[];
  };
}

type EmptyErrors = Record<never, never>;
type OptionalSchema = AnySchema | undefined;
type InputSchema<T extends OptionalSchema> = T extends AnySchema ? T : InitialInputSchema;
type OutputSchema<T extends OptionalSchema> = T extends AnySchema ? T : InitialOutputSchema;
type MergedSchema<A extends AnySchema, B extends AnySchema> = Schema<
  InferSchemaInput<A> & InferSchemaInput<B>,
  InferSchemaOutput<A> & InferSchemaOutput<B>
>;
type MergeSchemas<A extends OptionalSchema, B extends OptionalSchema> = A extends AnySchema
  ? B extends AnySchema
    ? MergedSchema<A, B>
    : A
  : B;
type NativeBuilder = typeof os;
type ExpectedOutput<T extends OptionalSchema> =
  | InferSchemaInput<OutputSchema<T>>
  | (undefined extends InferSchemaInput<OutputSchema<T>> ? void : never);
type FinalOutput<T extends OptionalSchema, THandlerOutput> = T extends AnySchema ? T : Schema<THandlerOutput>;

/**
 * Homarr's operation vocabulary over native oRPC builders. All parsing,
 * middleware execution, output validation, errors and streaming belong to oRPC.
 */
export class ApiProcedureBuilder<
  TContext extends object = ApiContext,
  TInput extends OptionalSchema = undefined,
  TOutput extends OptionalSchema = undefined,
> {
  constructor(readonly native: NativeBuilder = os) {}

  meta(meta: ApiMeta): ApiProcedureBuilder<TContext, TInput, TOutput> {
    return new ApiProcedureBuilder(
      this.native.meta({
        name: "homarr:metadata",
        init: (previous) => ({ ...previous, ...meta }),
      }),
    );
  }

  input<T extends AnySchema>(schema: T): ApiProcedureBuilder<TContext, MergeSchemas<TInput, T>, TOutput> {
    return new ApiProcedureBuilder(this.native.input(schema) as unknown as NativeBuilder);
  }

  output<T extends AnySchema>(schema: T): ApiProcedureBuilder<TContext, TInput, MergeSchemas<TOutput, T>> {
    return new ApiProcedureBuilder(this.native.output(schema) as unknown as NativeBuilder);
  }

  use<TAddedContext extends object>(
    middleware: Middleware<
      TContext,
      TAddedContext,
      InferSchemaOutput<InputSchema<TInput>>,
      InferSchemaInput<OutputSchema<TOutput>>,
      EmptyErrors
    >,
  ): ApiProcedureBuilder<MergedContext<TContext, TAddedContext>, TInput, TOutput> {
    return new ApiProcedureBuilder(
      this.native.use(middleware as unknown as Parameters<NativeBuilder["use"]>[0]) as unknown as NativeBuilder,
    );
  }

  /** Compose native builders while retaining each middleware's schema position. */
  concat<TAddedContext extends object, TAddedInput extends OptionalSchema, TAddedOutput extends OptionalSchema>(
    other: ApiProcedureBuilder<TAddedContext, TAddedInput, TAddedOutput>,
  ): ApiProcedureBuilder<
    MergedContext<TContext, TAddedContext>,
    MergeSchemas<TInput, TAddedInput>,
    MergeSchemas<TOutput, TAddedOutput>
  > {
    const left = this.native["~orpc"];
    const right = other.native["~orpc"];
    const builder = os.$context<ApiContext>().$config({});
    builder["~orpc"] = {
      ...left,
      ...right,
      meta: { ...left.meta, ...right.meta },
      metaPlugins: [...(left.metaPlugins ?? []), ...(right.metaPlugins ?? [])],
      errorMap: { ...left.errorMap, ...right.errorMap },
      inputSchemas: [...(left.inputSchemas ?? []), ...(right.inputSchemas ?? [])],
      outputSchemas: [...(left.outputSchemas ?? []), ...(right.outputSchemas ?? [])],
      orderedMiddlewares: [
        ...left.orderedMiddlewares,
        ...right.orderedMiddlewares.map((entry) => ({
          ...entry,
          inputSchemasLengthAtUse: (left.inputSchemas?.length ?? 0) + (entry.inputSchemasLengthAtUse ?? 0),
          outputSchemasLengthAtUse: (left.outputSchemas?.length ?? 0) + (entry.outputSchemasLengthAtUse ?? 0),
        })),
      ],
    };
    return new ApiProcedureBuilder(builder as unknown as NativeBuilder);
  }

  private finish<T extends ExpectedOutput<TOutput>, TType extends ApiOperation>(
    type: TType,
    handler: ProcedureHandler<TContext, InferSchemaOutput<InputSchema<TInput>>, T, EmptyErrors>,
  ): DecoratedProcedure<ApiContext, TContext, InputSchema<TInput>, FinalOutput<TOutput, Awaited<T>>, EmptyErrors> & {
    readonly __operationType?: TType;
  } {
    const guardedHandler: Parameters<NativeBuilder["handler"]>[0] = async (options) => {
      const context = options.context as ApiContext;
      const input = options.input as unknown;
      const selectedIds: string[] = [];
      if (Array.isArray(input)) {
        for (const id of input) if (typeof id === "string") selectedIds.push(id);
      } else if (input && typeof input === "object") {
        const selectors = input as Record<string, unknown>;
        if (typeof selectors.integrationId === "string") selectedIds.push(selectors.integrationId);
        if (Array.isArray(selectors.integrationIds))
          for (const id of selectors.integrationIds) if (typeof id === "string") selectedIds.push(id);
        if (options.path[0] === "integration" && typeof selectors.id === "string") selectedIds.push(selectors.id);
      }
      await context.workerAccess?.authorizeProcedure({
        path: options.path.join("."),
        kind: type,
        integrationIds: selectedIds,
        input,
      });
      const execute = (overrides?: { context?: object; input?: unknown }) =>
        handler(
          { ...options, ...overrides } as unknown as Parameters<typeof handler>[0],
          (overrides?.input ?? options.input) as InferSchemaOutput<InputSchema<TInput>>,
        );
      let result: unknown;
      if (options.procedure["~orpc"].meta.integration) {
        const { executeFederatedOperation } = await import("./federation/dispatch");
        result = await executeFederatedOperation({ ...options, context, execute });
      } else result = await execute();
      if (
        context.workerAccess?.role === "service" &&
        selectedIds.length > 0 &&
        options.procedure["~orpc"].meta.integration
      ) {
        const { signSourceMediaResult } = await import("./federation/source-media");
        result = await signSourceMediaResult(context, selectedIds, result);
      }
      if (context.workerAccess?.projectResult)
        return context.workerAccess.projectResult({ path: options.path.join("."), input, result });
      return result;
    };
    return this.meta({ operationType: type }).native.handler(guardedHandler) as unknown as DecoratedProcedure<
      ApiContext,
      TContext,
      InputSchema<TInput>,
      FinalOutput<TOutput, Awaited<T>>,
      EmptyErrors
    >;
  }

  query<T extends ExpectedOutput<TOutput>>(
    handler: ProcedureHandler<TContext, InferSchemaOutput<InputSchema<TInput>>, T, EmptyErrors>,
  ) {
    return this.finish("query", handler);
  }

  mutation<T extends ExpectedOutput<TOutput>>(
    handler: ProcedureHandler<TContext, InferSchemaOutput<InputSchema<TInput>>, T, EmptyErrors>,
  ) {
    return this.finish("mutation", handler);
  }

  subscription<T extends ExpectedOutput<TOutput>>(
    handler: ProcedureHandler<TContext, InferSchemaOutput<InputSchema<TInput>>, T, EmptyErrors>,
  ) {
    return this.finish("subscription", handler);
  }
}

export const createApiRouter = <const T>(router: T): T => router;
export const createLazyRouter = <T>(loader: () => Promise<T>): Lazy<T> =>
  new Lazy<T>({ meta: {}, loader: async () => ({ default: await loader() }) });
export const createApiCaller = <T extends AnyRouter>(router: T, context: ApiContext): RouterClient<T> =>
  createRouterClient(router as AnyRouter, { context }) as RouterClient<T>;
export const createCallerFactory =
  <T extends AnyRouter>(router: T) =>
  (context: ApiContext): RouterClient<T> =>
    createRouterClient(router as AnyRouter, { context }) as RouterClient<T>;

export const isDemoMode = env.DEMO_MODE;
export const isDemoReadOnly = env.DEMO_MODE && env.DEMO_READ_ONLY;
// This middleware precedes input parsing, so field errors also reach native clients.
// Output validation errors retain oRPC's private server-error payload.
const formattedProcedure = os.$context<ApiContext>().use(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof ORPCError && error.code === "BAD_REQUEST" && error.cause instanceof ValidationError) {
      const validation = new ZodError(error.cause.issues as ZodError["issues"]);
      throw new ApiError({
        code: error.code,
        message: error.message,
        cause: error.cause,
        data: { zodError: validation.flatten(), error: null },
      });
    }
    throw error;
  }
});
export const internalProcedure = new ApiProcedureBuilder<ApiContext>(formattedProcedure as unknown as NativeBuilder);
const baseProcedure = internalProcedure.use(({ procedure, next }) => {
  if (isDemoReadOnly && procedure["~orpc"].meta.operationType === "mutation") {
    throw new ApiError({ code: "FORBIDDEN", message: "Mutations are disabled in demo mode" });
  }
  return next();
});
export const publicProcedure = baseProcedure;
export const onboardingClaimedProcedure = baseProcedure.use(async ({ context, next }) => {
  const isAdmin = context.session?.user.permissions.includes("admin") ?? false;
  if (!isAdmin && !(await isClaimOnlyOnboardingAccessAllowedAsync(context.db, context.onboardingClaimToken))) {
    throw new ApiError({ code: "FORBIDDEN", message: "This onboarding session is not claimed." });
  }
  return next();
});
const enforceUserIsAuthed = os.$context<ApiContext>().middleware(({ context, next }) => {
  if (!context.session?.user) throw new ApiError({ code: "UNAUTHORIZED" });
  return next({ context: { session: { ...context.session, user: context.session.user } } });
});
export const protectedProcedure = baseProcedure.use(enforceUserIsAuthed);
export const demoWritableProtectedProcedure = internalProcedure.use(enforceUserIsAuthed);
export const permissionRequiredProcedure = {
  requiresPermission: (permission: GroupPermissionKey) =>
    protectedProcedure.use(({ context, next }) => {
      if (!context.session.user.permissions.includes(permission)) {
        throw new ApiError({ code: "FORBIDDEN", message: "Permission denied" });
      }
      return next();
    }),
};
export const onboardingProcedure = {
  requiresStep: (step: OnboardingStep) =>
    onboardingClaimedProcedure.use(async ({ context, next }) => {
      const currentStep = await getOnboardingOrFallbackAsync(context.db).then(({ current }) => current);
      if (currentStep !== step) throw new ApiError({ code: "FORBIDDEN", message: "Step denied" });
      return next();
    }),
};
