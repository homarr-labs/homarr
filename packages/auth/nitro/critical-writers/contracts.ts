import type { GroupPermissionKey } from "@homarr/definitions";

export type CriticalWriterCandidate =
  | {
      readonly kind: "save-group-permissions";
      readonly actorId: string;
      readonly groupId: string;
      readonly permissions: readonly GroupPermissionKey[];
    }
  | {
      readonly kind: "delete-group";
      readonly actorId: string;
      readonly groupId: string;
    }
  | { readonly kind: "sign-in-everyone-membership"; readonly userId: string }
  | {
      readonly kind: "sign-in-external-memberships";
      readonly userId: string;
      readonly externalGroups: readonly string[];
    };

export interface CriticalWriterRemainingJoin {
  readonly kind:
    | "authenticated-origin"
    | "credential-revalidation"
    | "enabled-writer-coverage"
    | "dispatch-lifetime"
    | "source-mode-and-provider-admission"
    | "native-evidence";
  readonly requirement: string;
}

export const criticalWriterRemainingJoins: readonly CriticalWriterRemainingJoin[] = Object.freeze([
  Object.freeze({
    kind: "authenticated-origin",
    requirement:
      "Accepted real request or sign-in authority must originate the actor, not a candidate ID, principal DTO or issuer chosen here; Q16 remains open.",
  }),
  Object.freeze({
    kind: "credential-revalidation",
    requirement:
      "Reacquire the exact privately verified credential and accepted validity bound under the user parent lock on this same bounded transaction; no credential witness producer is joined here.",
  }),
  Object.freeze({
    kind: "enabled-writer-coverage",
    requirement:
      "Composition must establish every enabled user/account/provider, session create/renew/revoke/cleanup, API-key create/replace/delete, membership/grant/group-cascade, sign-in/everyone, establishment/setup, admin/background and restore writer participates or stays unmounted; old gated writers and a supplied coverage DTO are not evidence.",
  }),
  Object.freeze({
    kind: "dispatch-lifetime",
    requirement:
      "Bind actual authority validity to G3 deadline before admission and own genuine authority/config/storage invalidation through native COMMIT and settlement, not an assertion callback, guessed revision or cancellation signal alone.",
  }),
  Object.freeze({
    kind: "source-mode-and-provider-admission",
    requirement:
      "Pin source demo/config admission before canonical source input/effects; candidate snapshots do not validate schemas. Sign-in reconciliation requires the actual source OIDC/LDAP event and local-management/provider gates, with provider I/O outside SQL.",
  }),
  Object.freeze({
    kind: "native-evidence",
    requirement:
      "Sequential review and authorized native race/rollback/dispatch tests must establish fresh reads, empty-set parent serialization, writer coverage and validity through actual COMMIT; source algorithms are not security proof.",
  }),
] satisfies CriticalWriterRemainingJoin[]);

export class CriticalWriterExecutionHeldError extends Error {
  readonly code = "CRITICAL_WRITER_EXECUTION_HELD";
  readonly remainingJoins = criticalWriterRemainingJoins;

  constructor() {
    super("Critical writers are held pending genuine authority, all-enabled-writer coverage and native COMMIT binding");
    this.name = "CriticalWriterExecutionHeldError";
  }
}

export function requireCriticalWriterExecutionJoin(): void {
  throw new CriticalWriterExecutionHeldError();
}

export class CriticalWriterSourceError extends Error {
  constructor(
    readonly reason: "unauthenticated" | "forbidden" | "not-found",
    message: string,
  ) {
    super(message);
    this.name = "CriticalWriterSourceError";
  }
}

export class CriticalWriterCurrentnessError extends Error {
  constructor() {
    super("Critical writer parent or membership facts changed during lock acquisition");
    this.name = "CriticalWriterCurrentnessError";
  }
}

export interface CurrentGroupFacts {
  readonly userId: string;
  readonly groupIds: readonly string[];
  readonly permissions: readonly GroupPermissionKey[];
}

export interface CurrentGroupParent {
  readonly id: string;
  readonly name: string;
}

export function snapshotCriticalWriterCandidate(candidate: CriticalWriterCandidate): CriticalWriterCandidate {
  switch (candidate.kind) {
    case "save-group-permissions":
      return Object.freeze({ ...candidate, permissions: Object.freeze([...candidate.permissions]) });
    case "sign-in-external-memberships":
      return Object.freeze({ ...candidate, externalGroups: Object.freeze([...candidate.externalGroups]) });
    case "delete-group":
    case "sign-in-everyone-membership":
      return Object.freeze({ ...candidate });
  }
}
