import type { createId } from "@homarr/common";
import type { and, eq, handleTransactionsAsync, like, max, not } from "@homarr/db";
import type { groupPermissions, groups, onboarding } from "@homarr/db/schema";
import type { groupCreateSchema } from "@homarr/validation/group";

export interface GroupEstablishmentProcedureResources {
  readonly tables: {
    readonly groupPermissions: typeof groupPermissions;
    readonly groups: typeof groups;
    readonly onboarding: typeof onboarding;
  };
  readonly operators: {
    readonly and: typeof and;
    readonly eq: typeof eq;
    readonly like: typeof like;
    readonly max: typeof max;
    readonly not: typeof not;
  };
  readonly schemas: {
    readonly groupCreateSchema: typeof groupCreateSchema;
  };
  readonly createId: typeof createId;
  readonly handleTransactionsAsync: typeof handleTransactionsAsync;
}
