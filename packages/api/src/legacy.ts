/**
 * Optional compatibility boundary for the existing Next dashboard.
 * Native workers must import `@homarr/api/orpc` instead of this entry.
 */
import { call, Lazy, ORPCError, Procedure, unlazy } from "@orpc/server";
import type { AnyRouter, InferSchemaInput, InferSchemaOutput } from "@orpc/server";
import { initTRPC, lazy, TRPCError } from "@trpc/server";
import type {
  TRPCBuiltRouter,
  TRPCMutationProcedure,
  TRPCQueryProcedure,
  TRPCRouterRecord,
  TRPCSubscriptionProcedure,
} from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod/v4";

import { FlattenError } from "@homarr/common";

import type { ApiContext, ApiOperation } from "./procedure";
import type { AppRouter as NativeAppRouter } from "./root";

const compatibility = initTRPC.context<ApiContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      error: error.cause instanceof FlattenError ? error.cause.flatten() : null,
    },
  }),
});

type LegacyDefinition<TInput, TOutput> = { input: TInput; output: TOutput; meta: unknown };
type LegacyByOperation<TInput, TOutput> = {
  query: TRPCQueryProcedure<LegacyDefinition<TInput, TOutput>>;
  mutation: TRPCMutationProcedure<LegacyDefinition<TInput, TOutput>>;
  subscription: TRPCSubscriptionProcedure<LegacyDefinition<TInput, TOutput>>;
};
type LegacyProcedure<T> =
  T extends Procedure<infer _Initial, infer _Injected, infer TInput, infer TOutput, infer _Errors>
    ? T extends { readonly __operationType?: infer TOperation extends ApiOperation }
      ? LegacyByOperation<InferSchemaInput<TInput>, InferSchemaOutput<TOutput>>[TOperation]
      : never
    : never;
type LegacyRecord<T> =
  T extends Lazy<infer TLoaded>
    ? LegacyRecord<TLoaded>
    : {
        [TKey in keyof T]: T[TKey] extends Procedure<
          infer _Initial,
          infer _Injected,
          infer _Input,
          infer _Output,
          infer _Errors
        >
          ? LegacyProcedure<T[TKey]>
          : LegacyRecord<T[TKey]>;
      };

/** Source compatibility only; the canonical AppRouter remains native oRPC. */
export type AppRouter = TRPCBuiltRouter<typeof compatibility._config.$types, LegacyRecord<NativeAppRouter>>;

function legacyError(error: unknown): never {
  if (error instanceof ORPCError) {
    const code = error.code;
    switch (code) {
      case "BAD_REQUEST":
      case "UNAUTHORIZED":
      case "FORBIDDEN":
      case "NOT_FOUND":
      case "METHOD_NOT_SUPPORTED":
      case "TIMEOUT":
      case "CONFLICT":
      case "PRECONDITION_FAILED":
      case "PAYLOAD_TOO_LARGE":
      case "UNPROCESSABLE_CONTENT":
      case "TOO_MANY_REQUESTS":
      case "CLIENT_CLOSED_REQUEST":
      case "INTERNAL_SERVER_ERROR":
      case "NOT_IMPLEMENTED":
      case "BAD_GATEWAY":
      case "SERVICE_UNAVAILABLE":
      case "GATEWAY_TIMEOUT":
        throw new TRPCError({ code, message: error.message, cause: error.cause ?? error });
      default:
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", cause: error });
    }
  }
  throw error;
}

/**
 * Builds an optional tRPC transport over native procedures. It owns no business
 * handlers, database connections, authentication providers, or API schemas.
 * Lazy namespaces stay lazy, and native parsing/authorization runs on every call.
 */
export function createLegacyApiRouter(router: NativeAppRouter): AppRouter {
  const adapt = (native: AnyRouter): ReturnType<typeof compatibility.router> => {
    const record: Record<string, TRPCRouterRecord[string] | ReturnType<typeof lazy>> = {};
    for (const [name, entry] of Object.entries(native)) {
      if (entry instanceof Lazy) {
        record[name] = lazy(async () => adapt((await unlazy(entry)).default));
        continue;
      }
      if (!(entry instanceof Procedure)) {
        record[name] = adapt(entry);
        continue;
      }

      // Input remains opaque here: native oRPC applies its original schema.
      const procedure = compatibility.procedure.input((input: unknown) => input);
      const invoke = async (options: { ctx: ApiContext; input: unknown; signal?: AbortSignal }) => {
        try {
          return await call(entry, options.input, { context: options.ctx, signal: options.signal });
        } catch (error) {
          legacyError(error);
        }
      };
      const operation = entry["~orpc"].meta.operationType as ApiOperation | undefined;
      if (operation === "subscription") {
        record[name] = procedure.subscription(async function* (options) {
          const events = await invoke(options);
          try {
            yield* events as AsyncIterable<unknown>;
          } catch (error) {
            legacyError(error);
          }
        });
        continue;
      }
      if (operation === "mutation") {
        record[name] = procedure.mutation(invoke);
        continue;
      }
      if (operation === "query") {
        record[name] = procedure.query(invoke);
        continue;
      }
      throw new Error(`Native procedure ${name} is missing its operation type.`);
    }
    return compatibility.router(record);
  };
  return adapt(router) as AppRouter;
}
