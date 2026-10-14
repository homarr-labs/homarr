import type { GroupPermissionKey } from "@homarr/definitions";

import type { MutationMode, PolicyIdentity } from "../identity";

export interface MediaGroupPermissionFacts {
  readonly userId: string;
  readonly groupIds: readonly string[];
  readonly permissions: readonly { readonly permission: GroupPermissionKey }[];
}

export interface MediaDeletionFacts {
  readonly id: string;
  readonly creatorId: string | null;
}

export type MediaMutationFacts = {
  readonly identity: PolicyIdentity;
  readonly mode: MutationMode;
} & ({ readonly action: "upload" } | { readonly action: "delete"; readonly media: MediaDeletionFacts | undefined });
