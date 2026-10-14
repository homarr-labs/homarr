import { defineMeta, ORPCError, os } from "@orpc/server";

import type { GroupPermissionKey, OnboardingStep } from "@homarr/definitions";

import type { SourceProjectionMetadata } from "../contracts/projection";
import type { BackendContext } from "./context";
import { toBackendError } from "./errors";
import type { SourceLeafPath, SourcePortRow } from "./port-map";

export type SourceAccess =
  | { readonly kind: "public" }
  | { readonly kind: "protected" }
  | { readonly kind: "permission"; readonly permission: GroupPermissionKey }
  | { readonly kind: "onboardingClaimed" }
  | { readonly kind: "onboardingStep"; readonly step: OnboardingStep };

type SourceProcedureIdentity = {
  [TRow in SourcePortRow as TRow[0]]: {
    readonly path: TRow[0];
    readonly kind: TRow[1] extends "Q" ? "query" : TRow[1] extends "M" ? "mutation" : "subscription";
  };
}[SourceLeafPath];

export type SourceProcedureDescriptor = SourceProcedureIdentity & {
  readonly access: SourceAccess;
  readonly demo: "guarded" | "internal" | "authenticatedException";
};

export type { SourceProjectionMetadata } from "../contracts/projection";

export const [sourceProjectionMeta, getSourceProjectionMeta] = defineMeta(
  "homarrSourceProjection",
  (incoming: SourceProjectionMetadata) => incoming,
);

export const [sourceProcedureMeta, getSourceProcedureMeta] = defineMeta(
  "homarrSourceProcedure",
  (incoming: SourceProcedureDescriptor) => incoming,
);

export type PublicQuerySourceDescriptor = SourceProcedureDescriptor & {
  readonly kind: "query";
  readonly access: { readonly kind: "public" };
  readonly demo: "guarded";
};

function assertSourceDemoAccess(context: Pick<BackendContext, "demo">, descriptor: SourceProcedureDescriptor): void {
  if (
    descriptor.demo === "guarded" &&
    context.demo.enabled &&
    context.demo.readOnly &&
    descriptor.kind === "mutation"
  ) {
    throw new ORPCError("FORBIDDEN", { message: "Mutations are disabled in demo mode" });
  }
}

export function assertPublicQuerySourceAccess(
  context: Pick<BackendContext, "demo">,
  descriptor: PublicQuerySourceDescriptor,
): void {
  assertSourceDemoAccess(context, descriptor);
}

export function assertSourceProcedureAccess(
  context: BackendContext,
  descriptor: SourceProcedureDescriptor,
): void | Promise<void> {
  assertSourceDemoAccess(context, descriptor);
  const access = descriptor.access;
  if (access.kind === "protected" || access.kind === "permission" || descriptor.demo === "authenticatedException") {
    if (context.principal.kind !== "authenticated") throw new ORPCError("UNAUTHORIZED");
  }
  if (access.kind === "permission") {
    if (context.principal.kind !== "authenticated" || !context.principal.user.permissions.includes(access.permission)) {
      throw new ORPCError("FORBIDDEN", { message: "Permission denied" });
    }
  }
  if (access.kind === "onboardingClaimed" || access.kind === "onboardingStep") {
    return (async () => {
      const isAdmin =
        context.principal.kind === "authenticated" && context.principal.user.permissions.includes("admin");
      if (!isAdmin && !(await context.setup.isClaimOnlyAccessAllowed(context.db, context.onboardingClaimToken))) {
        throw new ORPCError("FORBIDDEN", { message: "This onboarding session is not claimed." });
      }
      if (access.kind === "onboardingStep" && (await context.setup.currentStep(context.db)) !== access.step) {
        throw new ORPCError("FORBIDDEN", { message: "Step denied" });
      }
    })();
  }
}

export function sourceProcedure(descriptor: SourceProcedureDescriptor) {
  return os
    .$context<BackendContext>()
    .meta(sourceProcedureMeta(descriptor))
    .use(async ({ context, next }) => {
      try {
        return await next();
      } catch (error) {
        throw toBackendError(error, context);
      }
    })
    .use(async ({ context, next }) => {
      const admission = assertSourceProcedureAccess(context, descriptor);
      if (admission !== undefined) await admission;
      return next();
    });
}

export function authenticatedProcedure(
  descriptor: SourceProcedureDescriptor & {
    readonly access: Extract<SourceAccess, { kind: "protected" | "permission" }>;
  },
) {
  return sourceProcedure(descriptor).use(({ context, next }) => {
    if (context.principal.kind !== "authenticated") throw new ORPCError("UNAUTHORIZED");
    return next({ context: { principal: context.principal } });
  });
}
