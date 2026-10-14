import type { and, desc, eq, like } from "@homarr/db";
import type { medias } from "@homarr/db/schema";

import type { AuthenticatedBackendContext, BackendPrincipal } from "../../context";

export interface MediaReadLease {
  readonly db: AuthenticatedBackendContext["db"];
  readonly principal: BackendPrincipal;
  assertCurrentAsync(): Promise<void>;
  releaseAsync(): Promise<void>;
}

export interface MediaProcedureResources {
  readonly tables: { readonly medias: typeof medias };
  readonly operators: {
    readonly and: typeof and;
    readonly desc: typeof desc;
    readonly eq: typeof eq;
    readonly like: typeof like;
  };
  acquireReadAsync(context: AuthenticatedBackendContext): Promise<MediaReadLease>;
}
