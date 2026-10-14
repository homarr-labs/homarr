import type { ILogger } from "@homarr/core/infrastructure/logs";
import type { LogAuthorizer, LogHistoryBacking } from "@homarr/core/infrastructure/logs/runtime";

import type { AuthenticatedBackendContext } from "../../context";

export interface LogProcedureLease {
  readonly principal: AuthenticatedBackendContext["principal"];
  readonly authorizer: LogAuthorizer;
  readonly backing: LogHistoryBacking;
  readonly logger: ILogger;
  releaseAsync(): Promise<void>;
}

export interface LogProcedureResources {
  acquireAsync(context: AuthenticatedBackendContext, signal: AbortSignal): Promise<LogProcedureLease>;
}
