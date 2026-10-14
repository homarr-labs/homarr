export type Principal = { readonly kind: "anonymous" } | { readonly kind: "authenticated"; readonly subject: string };

export type SetupState = { readonly kind: "unavailable" } | { readonly kind: "required" } | { readonly kind: "ready" };

export type AccessRequirement =
  | { readonly kind: "public" }
  | { readonly kind: "protected"; readonly action: string; readonly resource: string };

export type AccessDecision = { readonly kind: "allow" } | { readonly kind: "deny"; readonly status: 401 | 403 };

export type ResponseEffect =
  | { readonly kind: "cookie"; readonly value: string }
  | { readonly kind: "header"; readonly name: string; readonly value: string; readonly mode: "set" | "append" };

export type OnboardingRequestCommand = "claim" | "nextStep" | "initUser" | "initialExternalGroup";

export interface OnboardingRequestCarrier {
  readonly command: OnboardingRequestCommand;
  readonly disposeAsync: () => Promise<void>;
}

export interface RequestContext {
  readonly request: Request;
  readonly requestId: string;
  readonly signal: AbortSignal;
  readonly principal: Principal;
  readonly setup: SetupState;
  readonly onboardingRequest?: OnboardingRequestCarrier | undefined;
  memoize<T>(key: symbol, read: () => Promise<T>): Promise<T>;
  effect(effect: ResponseEffect): void;
  onDispose(dispose: () => void | Promise<void>): void;
  onPrivateResponsePublication(guard: { readonly signal: AbortSignal; assertCurrentAsync(): Promise<void> }): void;
  authorize(requirement: AccessRequirement): Promise<AccessDecision>;
}

export interface RequestServices {
  captureOnboardingRequest?(
    context: Pick<RequestContext, "request" | "signal" | "requestId" | "onDispose"> & {
      readonly lifetime: AbortSignal;
    },
  ): OnboardingRequestCarrier | undefined;
  resolvePrincipal(
    context: Pick<RequestContext, "request" | "signal" | "requestId" | "onDispose" | "onboardingRequest">,
  ): Promise<Principal>;
  resolveSetup(context: Pick<RequestContext, "signal" | "requestId">): Promise<SetupState>;
  authorize(
    principal: Principal,
    requirement: Extract<AccessRequirement, { kind: "protected" }>,
    signal: AbortSignal,
  ): Promise<AccessDecision>;
}
