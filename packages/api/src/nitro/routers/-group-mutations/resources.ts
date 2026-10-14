import type { z } from "zod/v4";

import type { eq, handleTransactionsAsync } from "@homarr/db";
import type { groupPermissions, groups } from "@homarr/db/schema";
import type { groupSavePermissionsSchema, groupSavePositionsSchema } from "@homarr/validation/group";

export const groupMutationsExecutionHold = Object.freeze({
  kind: "hold",
  reason:
    "Group mutations are held pending authenticated admin, compatible-writer, current-authority-to-COMMIT and lifetime bindings.",
} as const);

export type GroupSavePositionsInput = z.output<typeof groupSavePositionsSchema>;
export type GroupSavePermissionsInput = z.output<typeof groupSavePermissionsSchema>;

export interface GroupMutationsProcedureResources {
  readonly execution: typeof groupMutationsExecutionHold;
  readonly tables: {
    readonly groupPermissions: typeof groupPermissions;
    readonly groups: typeof groups;
  };
  readonly operators: {
    readonly eq: typeof eq;
  };
  readonly schemas: {
    readonly groupSavePermissionsSchema: typeof groupSavePermissionsSchema;
    readonly groupSavePositionsSchema: typeof groupSavePositionsSchema;
  };
  readonly handleTransactionsAsync: typeof handleTransactionsAsync;
}
