import type { GroupPermissionKey, OnboardingStep } from "@homarr/definitions";

export type PolicyIdentity =
  | { readonly type: "anonymous" }
  | {
      readonly type: "authenticated";
      readonly userId: string;
      readonly groupIds: readonly string[];
      readonly permissions: readonly GroupPermissionKey[];
    };

export type AuthorizationDenial =
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "invalid-claim"
  | "wrong-step"
  | "demo-read-only";

export type AuthorizationDecision =
  | { readonly type: "allow" }
  | { readonly type: "deny"; readonly reason: AuthorizationDenial };

export class AuthorizationError extends Error {
  constructor(readonly reason: AuthorizationDenial) {
    super("Authorization denied");
    this.name = "AuthorizationError";
  }
}

export function snapshotPolicyIdentity(identity: PolicyIdentity): PolicyIdentity {
  return identity.type === "anonymous"
    ? Object.freeze({ type: "anonymous" })
    : Object.freeze({
        type: "authenticated",
        userId: identity.userId,
        groupIds: Object.freeze([...identity.groupIds]),
        permissions: Object.freeze([...identity.permissions]),
      });
}

export function assertAuthorized(decision: AuthorizationDecision): asserts decision is { readonly type: "allow" } {
  if (decision.type === "deny") throw new AuthorizationError(decision.reason);
}

export function requireAuthenticated(identity: PolicyIdentity): AuthorizationDecision {
  return identity.type === "authenticated" ? { type: "allow" } : { type: "deny", reason: "unauthenticated" };
}

export function hasGlobalPermission(identity: PolicyIdentity, permission: GroupPermissionKey) {
  return identity.type === "authenticated" && identity.permissions.includes(permission);
}

export function requireGlobalPermission(
  identity: PolicyIdentity,
  permission: GroupPermissionKey,
): AuthorizationDecision {
  if (identity.type === "anonymous") return { type: "deny", reason: "unauthenticated" };
  return hasGlobalPermission(identity, permission) ? { type: "allow" } : { type: "deny", reason: "forbidden" };
}

export function authorizeSelfOrAdmin(
  identity: PolicyIdentity,
  targetUserId: string,
  denial: "forbidden" | "not-found" = "forbidden",
): AuthorizationDecision {
  if (identity.type === "anonymous") return { type: "deny", reason: "unauthenticated" };
  return identity.userId === targetUserId || hasGlobalPermission(identity, "admin")
    ? { type: "allow" }
    : { type: "deny", reason: denial };
}

export interface MutationMode {
  readonly demoMode: boolean;
  readonly demoReadOnly: boolean;
}

export function enforceMutationMode(mode: MutationMode, operation: "query" | "mutation"): AuthorizationDecision {
  return operation === "mutation" && mode.demoMode && mode.demoReadOnly
    ? { type: "deny", reason: "demo-read-only" }
    : { type: "allow" };
}

export function enforceDemoAccountMutation(
  mode: MutationMode,
  change:
    | "delete"
    | "password"
    | { readonly type: "profile"; readonly currentName: string | null; readonly nextName: string },
): AuthorizationDecision {
  const restricted = typeof change === "string" || change.currentName !== change.nextName;
  return mode.demoMode && restricted ? { type: "deny", reason: "demo-read-only" } : { type: "allow" };
}

export interface SetupAuthorizationEvidence {
  readonly hasUsers: boolean;
  readonly claim: "valid" | "invalid" | "absent";
  readonly currentStep: OnboardingStep;
}

export function authorizeSetup(
  identity: PolicyIdentity,
  evidence: SetupAuthorizationEvidence,
  step?: OnboardingStep,
): AuthorizationDecision {
  if (!hasGlobalPermission(identity, "admin") && (evidence.hasUsers || evidence.claim !== "valid")) {
    return { type: "deny", reason: "invalid-claim" };
  }
  if (step !== undefined && evidence.currentStep !== step) return { type: "deny", reason: "wrong-step" };
  return { type: "allow" };
}

export interface PermissionDefinitions {
  readonly getPermissionsWithChildren: (permissions: GroupPermissionKey[]) => GroupPermissionKey[];
}

export function resolveEffectivePermissions(
  definitions: PermissionDefinitions,
  selected: readonly GroupPermissionKey[],
): readonly GroupPermissionKey[] {
  return Object.freeze(definitions.getPermissionsWithChildren([...selected]));
}
