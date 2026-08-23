/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1)
 * 2. You want to create a new middleware or type of procedure (see Part 3)
 *
 * tl;dr - this is where all the tRPC server stuff is created and plugged in.
 * The pieces you will need to use are documented accordingly near the end
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { OpenApiMeta } from "trpc-to-openapi";
import { ZodError } from "zod/v4";

import type { Session } from "@homarr/auth";
import { extractBaseUrlFromHeaders, FlattenError } from "@homarr/common";
import { userAgent } from "@homarr/common/server";
import type { DeviceType } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { db } from "@homarr/db";
import type { GroupPermissionKey, OnboardingStep } from "@homarr/definitions";

import { env } from "./env";
import { getOnboardingClaimTokenFromCookieHeader, isClaimOnlyOnboardingAccessAllowedAsync } from "./onboarding-claim";
import { getOnboardingOrFallbackAsync } from "./router/onboard/onboard-queries";
import type { McpMeta } from "./mcp-tools";

const logger = createLogger({ module: "trpc" });

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
interface ApiContext {
  session: Session | null;
  deviceType: DeviceType;
  baseUrl?: `${string}://${string}`;
  onboardingClaimToken?: string;
  db: typeof db;
}

export const createTRPCContext = (opts: { headers: Headers; session: Session | null }): ApiContext => {
  const session = opts.session;
  const source = opts.headers.get("x-trpc-source") ?? "unknown";

  logger.info("Received tRPC request", {
    source,
    userId: session?.user.id,
    userName: session?.user.name,
  });

  return {
    session,
    deviceType: userAgent(opts.headers).device.type,
    baseUrl: extractBaseUrlFromHeaders(opts.headers),
    onboardingClaimToken: getOnboardingClaimTokenFromCookieHeader(opts.headers.get("cookie")),
    db,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the trpc api is initialized, connecting the context and
 * transformer
 */
const t = initTRPC
  .context<typeof createTRPCContext>()
  .meta<OpenApiMeta & McpMeta>()
  .create({
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

/**
 * Create a server-side caller
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these
 * a lot in the /src/server/api/routers folder
 */

/**
 * This is how you create new routers and subrouters in your tRPC API
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

export const isDemoMode = env.DEMO_MODE;

// The public "real demo" (demo + mock integrations) stays read-only, while preview
// deployments run with DEMO_MODE + DEMO_READ_ONLY=false to allow mutations.
export const isDemoReadOnly = env.DEMO_MODE && env.DEMO_READ_ONLY;

const enforceDemoModeReadOnly = t.middleware(({ ctx, next, type }) => {
  if (isDemoReadOnly && type === "mutation") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Mutations are disabled in demo mode",
    });
  }
  return next({ ctx });
});

const baseProcedure = isDemoReadOnly ? t.procedure.use(enforceDemoModeReadOnly) : t.procedure;

/**
 * Public (unauthed) procedure
 *
 * This is the base piece you use to build new queries and mutations on your
 * tRPC API. It does not guarantee that a user querying is authorized, but you
 * can still access user session data if they are logged in
 */
export const publicProcedure = baseProcedure;

const enforceOnboardingAccess = t.middleware(async ({ ctx, next }) => {
  const isAdmin = ctx.session?.user.permissions.includes("admin") ?? false;
  if (!isAdmin) {
    const hasValidClaim = await isClaimOnlyOnboardingAccessAllowedAsync(ctx.db, ctx.onboardingClaimToken);
    if (!hasValidClaim) {
      throw new TRPCError({ code: "FORBIDDEN", message: "This onboarding session is not claimed." });
    }
  }
  return next({ ctx });
});

export const onboardingClaimedProcedure = baseProcedure.use(enforceOnboardingAccess);

export const internalProcedure = t.procedure;

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

/**
 * Protected (authed) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use
 * this. It verifies the session is valid and guarantees ctx.session.user is not
 * null
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = baseProcedure.use(enforceUserIsAuthed);

/**
 * Procedure that requires a specific permission
 *
 * If you want a query or mutation to ONLY be accessible to users with a specific permission, use
 * this. It verifies that the user has the required permission
 *
 * @see https://trpc.io/docs/procedures
 */
export const permissionRequiredProcedure = {
  requiresPermission: (permission: GroupPermissionKey) => {
    return protectedProcedure.use(({ ctx, input, next }) => {
      if (!ctx.session.user.permissions.includes(permission)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Permission denied",
        });
      }
      return next({ input, ctx });
    });
  },
};

export const onboardingProcedure = {
  requiresStep: (step: OnboardingStep) => {
    return onboardingClaimedProcedure.use(async ({ ctx, input, next }) => {
      const currentStep = await getOnboardingOrFallbackAsync(ctx.db).then(({ current }) => current);
      if (currentStep !== step) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Step denied",
        });
      }

      return next({ input, ctx });
    });
  },
};
