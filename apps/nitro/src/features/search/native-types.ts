import type { createIntegrationManagementProcedures } from "../../../../../packages/api/src/nitro/routers/integration";
import type { createIntegrationOperationsProcedures } from "../../../../../packages/api/src/nitro/routers/integration-operations";

export type NativeIntegrationProcedures = Pick<
  ReturnType<typeof createIntegrationManagementProcedures>,
  "all" | "allThatSupportSearch"
> &
  Pick<
    ReturnType<typeof createIntegrationOperationsProcedures>,
    | "searchInIntegration"
    | "mediaRequestSearchTargets"
    | "searchMediaRequests"
    | "getMediaRequestOptions"
    | "requestMedia"
  >;
