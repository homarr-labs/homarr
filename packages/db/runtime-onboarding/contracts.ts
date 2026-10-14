import type { SupportedAuthProvider } from "@homarr/definitions";

import type {
  NativeCredentialEvidence,
  NativeCredentialPolicyConfiguration,
} from "../runtime-auth-credential/contracts";
import {
  authCredentialProvider,
  authCredentialRecord,
  authCredentialText,
  authCredentialTimestamp,
  captureNativeCredentialEvidence,
  captureNativeCredentialPolicyConfiguration,
} from "../runtime-auth-credential/validation";

export interface OnboardingOperation {
  readonly signal: AbortSignal;
  readonly lifetime: AbortSignal;
  readonly deadlineAt: number;
  readonly originalWallStartedAt: number;
  readonly originalMonotonicStartedAt: number;
  readonly originalBudgetMs: number;
  readonly originalMonotonicExpiresAt: number;
}

export interface OnboardingSqlConfiguration extends NativeCredentialPolicyConfiguration {
  readonly demoEnabled: boolean;
  readonly readOnly: boolean;
  readonly enabledProviders: readonly SupportedAuthProvider[];
}

export type OnboardingRetainedAuthority =
  | { readonly kind: "stored-admin"; readonly credential: NativeCredentialEvidence }
  | { readonly kind: "stored-claim"; readonly token: string };

export type OnboardingClaimAuthority =
  | { readonly kind: "claim-request"; readonly currentToken: string | null }
  | {
      readonly kind: "stored-admin";
      readonly credential: NativeCredentialEvidence;
      readonly currentToken: string | null;
    };

export interface OnboardingStepWitness {
  readonly id: string;
  readonly step: string;
  readonly previousStep: string | null;
}

export type OnboardingInvocation =
  | { readonly kind: "claim"; readonly authority: OnboardingClaimAuthority }
  | {
      readonly kind: "nextStep";
      readonly authority: OnboardingRetainedAuthority;
      readonly firstRead: OnboardingStepWitness;
    }
  | {
      readonly kind: "initUser";
      readonly authority: OnboardingRetainedAuthority;
      readonly userRow: {
        readonly id: string;
        readonly name: string;
        readonly email: string | null;
        readonly password: string;
      };
      readonly groupId: string;
    }
  | {
      readonly kind: "initialExternalGroup";
      readonly authority: OnboardingRetainedAuthority;
      readonly groupId: string;
      readonly name: string;
    };

export type OnboardingClaimInvocation = Extract<OnboardingInvocation, { readonly kind: "claim" }>;
export type OnboardingNextStepInvocation = Extract<OnboardingInvocation, { readonly kind: "nextStep" }>;
export type OnboardingInitUserInvocation = Extract<OnboardingInvocation, { readonly kind: "initUser" }>;
export type OnboardingInitialExternalGroupInvocation = Extract<
  OnboardingInvocation,
  { readonly kind: "initialExternalGroup" }
>;

export type OnboardingClaimResult =
  | { readonly status: "issued" | "active"; readonly token: string; readonly expiresAt: number }
  | { readonly status: "locked"; readonly expiresAt: number }
  | { readonly status: "finished" | "forbidden" };

export interface OnboardingResults {
  readonly claim: OnboardingClaimResult;
  readonly nextStep: void;
  readonly initUser: void;
  readonly initialExternalGroup: void;
}

export interface OnboardingNativePublicationHandle {
  readonly kind: "onboarding-native-publication";
}

export interface OnboardingNativePublicationBounds {
  readonly originalWallStartedAt: number;
  readonly originalMonotonicStartedAt: number;
  readonly originalBudgetMs: number;
  readonly originalMonotonicExpiresAt: number;
  readonly originalDeadlineAt: number;
  readonly effectiveWallDeadlineAt: number;
  readonly effectiveMonotonicExpiresAt: number;
  readonly maximumAbsoluteClockSkewMs: number;
  readonly lastNativeMonotonicAt: number;
  readonly claimExpiresAt: number | null;
  readonly session: {
    readonly expiresAt: number;
    readonly hostDeadlineAt: number;
  } | null;
}

export interface OnboardingNativePublicationFacts {
  readonly command: OnboardingInvocation["kind"];
  readonly commit: "not-dispatched" | "dispatched-unconfirmed" | "acknowledged";
  readonly finalGate: "not-passed" | "passed";
  readonly bounds: OnboardingNativePublicationBounds | null;
  readonly unit: "pending" | "returned" | "rejected";
  readonly cleanup: "pending" | "complete" | "failed";
  readonly runtimeGuard: "pending" | "passed" | "failed";
  readonly failureStage: "none" | "admission" | "body" | "commit" | "post-commit-guard" | "cleanup" | "runtime-guard";
  readonly cleanupFailureCount: number;
}

export type OnboardingNativePublicationRead =
  | { readonly kind: "pending"; readonly facts: OnboardingNativePublicationFacts }
  | {
      readonly kind: "settled";
      readonly facts: OnboardingNativePublicationFacts;
      readonly temporal: "within-original-and-observed-bounds" | "expired" | "clock-invalid" | "clock-unavailable";
    };

export interface OnboardingNativePublicationReader {
  readOnboardingNativePublication(
    handle: OnboardingNativePublicationHandle,
    operation: OnboardingOperation,
    invocation: OnboardingInvocation,
  ): OnboardingNativePublicationRead;
  consumeOnboardingNativePublication(
    handle: OnboardingNativePublicationHandle,
    operation: OnboardingOperation,
    invocation: OnboardingInvocation,
  ): Extract<OnboardingNativePublicationRead, { readonly kind: "settled" }>;
  disposeOnboardingNativePublication(
    handle: OnboardingNativePublicationHandle,
    operation: OnboardingOperation,
    invocation: OnboardingInvocation,
  ): void;
}

export interface OnboardingObservedDispatch<T> {
  readonly publication: OnboardingNativePublicationHandle;
  readonly reader: OnboardingNativePublicationReader;
  readonly completion: Promise<T>;
}

export class OnboardingPreconditionError extends Error {
  readonly code = "ONBOARDING_PRECONDITION";
  readonly retryable = false;

  constructor() {
    super("Onboarding transaction precondition failed");
    this.name = "OnboardingPreconditionError";
  }
}

export const rejectOnboarding = (): never => {
  throw new OnboardingPreconditionError();
};

const finite = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return rejectOnboarding();
  return value;
};

const nullableText = (value: unknown, maximumLength: number): string | null => {
  if (value === null) return null;
  if (value === "") return "";
  return authCredentialText(value, maximumLength);
};

const token = (value: unknown): string => {
  const result = authCredentialText(value, 512);
  if (Buffer.byteLength(result, "utf8") > 512) return rejectOnboarding();
  return result;
};

const credential = (input: unknown): NativeCredentialEvidence => {
  const value = authCredentialRecord(input);
  const binding = {
    namespace: authCredentialText(value.namespace, 36),
    lifetimeSequence: authCredentialText(value.lifetimeSequence, 19),
    writeSequence: authCredentialText(value.writeSequence, 19),
    userId: authCredentialText(value.userId, 64),
    provider: authCredentialProvider(value.provider),
  };
  if (value.type === "opaque-session") {
    return captureNativeCredentialEvidence({
      ...binding,
      type: "opaque-session",
      token: authCredentialText(value.token),
      expiresAt: authCredentialTimestamp(value.expiresAt),
      hostDeadlineAt: authCredentialTimestamp(value.hostDeadlineAt),
    });
  }
  if (value.type !== "api-key") return rejectOnboarding();
  return captureNativeCredentialEvidence({
    ...binding,
    type: "api-key",
    id: authCredentialText(value.id, 64),
    hash: authCredentialText(value.hash),
  });
};

const retainedAuthority = (input: unknown): OnboardingRetainedAuthority => {
  const value = authCredentialRecord(input);
  if (value.kind === "stored-admin")
    return Object.freeze({ kind: "stored-admin", credential: credential(value.credential) });
  if (value.kind !== "stored-claim") return rejectOnboarding();
  return Object.freeze({ kind: "stored-claim", token: token(value.token) });
};

const claimAuthority = (input: unknown): OnboardingClaimAuthority => {
  const value = authCredentialRecord(input);
  const currentToken = nullableText(value.currentToken, 512);
  if (currentToken !== null && Buffer.byteLength(currentToken, "utf8") > 512) return rejectOnboarding();
  if (value.kind === "claim-request") return Object.freeze({ kind: "claim-request", currentToken });
  if (value.kind !== "stored-admin") return rejectOnboarding();
  return Object.freeze({ kind: "stored-admin", credential: credential(value.credential), currentToken });
};

export const captureOnboardingStep = (input: unknown): OnboardingStepWitness => {
  const value = authCredentialRecord(input);
  const step = authCredentialText(value.step, 64);
  if (!["start", "user", "group", "setup", "finish", "settings", "integrations"].includes(step))
    return rejectOnboarding();
  const previousStep = nullableText(value.previousStep, 64);
  if (
    previousStep !== null &&
    !["start", "user", "group", "setup", "finish", "settings", "integrations"].includes(previousStep)
  )
    return rejectOnboarding();
  return Object.freeze({ id: authCredentialText(value.id, 64), step, previousStep });
};

const invocation = (input: OnboardingInvocation): OnboardingInvocation => {
  const value = authCredentialRecord(input);
  if (value.kind === "claim") return Object.freeze({ kind: "claim", authority: claimAuthority(value.authority) });
  const authority = retainedAuthority(value.authority);
  if (value.kind === "nextStep")
    return Object.freeze({ kind: "nextStep", authority, firstRead: captureOnboardingStep(value.firstRead) });
  if (value.kind === "initialExternalGroup")
    return Object.freeze({
      kind: "initialExternalGroup",
      authority,
      groupId: authCredentialText(value.groupId, 64),
      name: authCredentialText(value.name, 255),
    });
  if (value.kind !== "initUser") return rejectOnboarding();
  const user = authCredentialRecord(value.userRow);
  const password = authCredentialText(user.password, 60);
  if (!/^\$2[aby]\$10\$[./A-Za-z0-9]{53}$/.test(password)) return rejectOnboarding();
  return Object.freeze({
    kind: "initUser",
    authority,
    userRow: Object.freeze({
      id: authCredentialText(user.id, 64),
      name: authCredentialText(user.name, 255),
      email: nullableText(user.email, 512),
      password,
    }),
    groupId: authCredentialText(value.groupId, 64),
  });
};

export interface CapturedOnboardingMutation {
  readonly operation: OnboardingOperation;
  readonly invocation: OnboardingInvocation;
  readonly configuration: OnboardingSqlConfiguration;
}

export const captureOnboardingMutation = (
  operation: OnboardingOperation,
  input: OnboardingInvocation,
  options: OnboardingSqlConfiguration,
): CapturedOnboardingMutation => {
  const bounds = authCredentialRecord(operation);
  const signal = bounds.signal;
  const lifetime = bounds.lifetime;
  if (!(signal instanceof AbortSignal) || !(lifetime instanceof AbortSignal)) return rejectOnboarding();
  const deadlineAt = finite(bounds.deadlineAt);
  const originalWallStartedAt = authCredentialTimestamp(bounds.originalWallStartedAt);
  const originalMonotonicStartedAt = finite(bounds.originalMonotonicStartedAt);
  const originalBudgetMs = finite(bounds.originalBudgetMs);
  const originalMonotonicExpiresAt = finite(bounds.originalMonotonicExpiresAt);
  if (
    originalWallStartedAt < 0 ||
    originalMonotonicStartedAt < 0 ||
    originalBudgetMs <= 0 ||
    !Number.isFinite(originalWallStartedAt + originalBudgetMs) ||
    originalMonotonicExpiresAt !== originalMonotonicStartedAt + originalBudgetMs ||
    deadlineAt > originalWallStartedAt + originalBudgetMs
  )
    return rejectOnboarding();
  const configuration = authCredentialRecord(options);
  if (typeof configuration.demoEnabled !== "boolean" || typeof configuration.readOnly !== "boolean")
    return rejectOnboarding();
  if (configuration.demoEnabled && configuration.readOnly) return rejectOnboarding();
  const rawProviders: unknown = configuration.enabledProviders;
  if (!Array.isArray(rawProviders) || rawProviders.length > 3) return rejectOnboarding();
  const providers: SupportedAuthProvider[] = [];
  for (let index = 0; index < rawProviders.length; index += 1) {
    const property = Object.getOwnPropertyDescriptor(rawProviders, String(index));
    if (!property || !("value" in property)) return rejectOnboarding();
    const provider = authCredentialProvider(property.value);
    if (providers.includes(provider)) return rejectOnboarding();
    providers.push(provider);
  }
  const policy = captureNativeCredentialPolicyConfiguration(options);
  return Object.freeze({
    operation: Object.freeze({
      signal,
      lifetime,
      deadlineAt,
      originalWallStartedAt,
      originalMonotonicStartedAt,
      originalBudgetMs,
      originalMonotonicExpiresAt,
    }),
    invocation: invocation(input),
    configuration: Object.freeze({
      ...policy,
      demoEnabled: configuration.demoEnabled,
      readOnly: configuration.readOnly,
      enabledProviders: Object.freeze(providers),
    }),
  });
};
