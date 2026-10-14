import type { RequestContext, RequestServices, AccessRequirement } from "./request";

export const dispatchPhases = ["auth", "rpc", "api", "stream", "binary", "asset"] as const;

export type DispatchPhase = (typeof dispatchPhases)[number];

export type FetchOutcome = { readonly kind: "pass" } | { readonly kind: "response"; readonly response: Response };

export interface FetchContribution {
  readonly phase: DispatchPhase;
  readonly path: `/${string}`;
  readonly descendants?: boolean;
  readonly access: AccessRequirement;
  handle(context: RequestContext): Promise<FetchOutcome>;
}

export interface RuntimeContribution {
  readonly id: string;
  readonly routes?: readonly FetchContribution[];
  ready?(signal: AbortSignal): void | Promise<void>;
  dispose?(): void | Promise<void>;
}

export type AuthHttpPublicationCause =
  | { readonly kind: "error"; readonly error: unknown }
  | { readonly kind: "cancel"; readonly reason: unknown };

export interface AuthHttpSettlementFailure {
  readonly stage: "read" | "publication" | "reader-closed" | "release-lock";
  readonly error: unknown;
}

export type AuthHttpPublicationTerminal =
  | { readonly kind: "published"; readonly boundary: "bodyless" | "head" | "eof" }
  | { readonly kind: "abandoned"; readonly cause: AuthHttpPublicationCause }
  | {
      readonly kind: "cancel-failed";
      readonly cause: AuthHttpPublicationCause;
      readonly cancellationError: unknown;
      readonly otherFailures: readonly AuthHttpSettlementFailure[];
    }
  | {
      readonly kind: "settlement-failed";
      readonly cause: AuthHttpPublicationCause;
      readonly failures: readonly [AuthHttpSettlementFailure, ...AuthHttpSettlementFailure[]];
    };

export type AuthHttpPublicationAbandonment = Exclude<AuthHttpPublicationTerminal, { readonly kind: "published" }>;

export interface AuthHttpPublicationHandle {
  readonly lifetime: AbortSignal;
  assertCurrent(): void;
  finish(terminal: AuthHttpPublicationTerminal): void;
}

export interface AuthHttpPublicationProducer {
  claimResponsePublication(
    originalContext: RequestContext,
    originalCompletedResponse: Response,
  ): AuthHttpPublicationHandle;
  finishUnclaimedResponsePublication(
    originalContext: RequestContext,
    originalCompletedResponse: Response,
    terminal: AuthHttpPublicationAbandonment,
  ): void;
}

export type AuthHttpPublicationEnrollment =
  | { readonly kind: "disabled" }
  | {
      readonly kind: "enrolled";
      readonly routes: readonly FetchContribution[];
      readonly producer: AuthHttpPublicationProducer;
    };

export type OnboardingHttpPublicationEndpoint =
  | { readonly method: "GET"; readonly path: "/api/onboarding/claim" }
  | {
      readonly method: "POST";
      readonly path:
        | "/api/onboarding/claim"
        | "/rpc/onboard/nextStep"
        | "/rpc/user/initUser"
        | "/rpc/group/createInitialExternalGroup";
    };

export interface OnboardingHttpPublicationRead {
  readonly body: Uint8Array;
  readonly sourceOutcome: "output" | "error";
  readonly primary: { readonly kind: "none" } | { readonly kind: "failed"; readonly error: unknown };
  readonly native: unknown;
}

export type OnboardingHttpPublicationResult = {
  readonly sourceOutcome: "output" | "error";
  readonly primary: OnboardingHttpPublicationRead["primary"];
  readonly cleanup: "complete" | "failed";
  readonly native: unknown;
} & ({ readonly kind: "published" } | { readonly kind: "abandoned"; readonly cause: unknown });

export interface OnboardingHttpPublicationHandle {
  read(): OnboardingHttpPublicationRead;
  finishAsync(): Promise<OnboardingHttpPublicationResult>;
  abandonAsync(cause: unknown): Promise<OnboardingHttpPublicationResult>;
}

export interface OnboardingHttpPublicationProducer {
  claim(originalContext: RequestContext, returnedWireResponse: Response): OnboardingHttpPublicationHandle;
  abandonAsync(
    originalContext: RequestContext,
    returnedWireResponse: Response,
    cause: unknown,
  ): Promise<OnboardingHttpPublicationResult>;
}

export type OnboardingHttpPublicationEnrollment =
  | { readonly kind: "disabled" }
  | {
      readonly kind: "enrolled";
      readonly routes: readonly FetchContribution[];
      readonly endpoints: readonly OnboardingHttpPublicationEndpoint[];
      readonly producer: OnboardingHttpPublicationProducer;
    };

export interface ApplicationOptions {
  readonly contributions?: readonly RuntimeContribution[];
  readonly services?: Partial<RequestServices>;
  readonly authHttpPublication?: AuthHttpPublicationEnrollment;
  readonly onboardingPublication?: OnboardingHttpPublicationEnrollment;
  render?(context: RequestContext): Promise<Response>;
  reportError?(error: unknown, requestId: string): void;
}

export interface Application {
  ready(): Promise<void>;
  fetch(request: Request): Promise<Response>;
  dispose(): Promise<void>;
}
