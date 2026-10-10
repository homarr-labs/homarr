export type Principal =
  | { readonly kind: "anonymous" }
  | { readonly kind: "authenticated"; readonly subject: string; readonly sessionRevision: string };

export type SetupState = { readonly kind: "unavailable" } | { readonly kind: "required" } | { readonly kind: "ready" };

export type AccessRequirement =
  | { readonly kind: "public" }
  | { readonly kind: "protected"; readonly action: string; readonly resource: string };

export type AccessDecision = { readonly kind: "allow" } | { readonly kind: "deny"; readonly status: 401 | 403 };

export type ResponseEffect =
  | { readonly kind: "cookie"; readonly value: string }
  | { readonly kind: "header"; readonly name: string; readonly value: string; readonly mode: "set" | "append" };

export interface RequestContext {
  readonly request: Request;
  readonly requestId: string;
  readonly signal: AbortSignal;
  readonly principal: Principal;
  readonly setup: SetupState;
  memoize<T>(key: symbol, read: () => Promise<T>): Promise<T>;
  effect(effect: ResponseEffect): void;
  onDispose(dispose: () => void | Promise<void>): void;
  authorize(requirement: AccessRequirement): Promise<AccessDecision>;
}

export interface RequestServices {
  resolvePrincipal(context: Pick<RequestContext, "request" | "signal" | "requestId">): Promise<Principal>;
  resolveSetup(context: Pick<RequestContext, "signal" | "requestId">): Promise<SetupState>;
  authorize(
    principal: Principal,
    requirement: Extract<AccessRequirement, { kind: "protected" }>,
    signal: AbortSignal,
  ): Promise<AccessDecision>;
}
