import type { parse, stringify } from "superjson";

import type { createId, Stopwatch } from "@homarr/common";
import type { and, count, countDistinct, Database, eq } from "@homarr/db";
import type { isPostgresql } from "@homarr/db/collection";
import type { getSchemaForDatabase } from "@homarr/db/schema";

export type AnalyticsResult = "sent" | "skipped" | "disabled" | "failed";

export interface AnalyticsCaptureEvent {
  readonly uuid: string;
  readonly distinctId: string;
  readonly event: "server-analytics";
  readonly properties: Record<string, unknown>;
  readonly disableGeoip: true;
}

export interface AnalyticsClient {
  capture(event: AnalyticsCaptureEvent): void;
  flush(): Promise<void>;
}

export interface AnalyticsSnapshotResources {
  readonly getSchemaForDatabase: typeof getSchemaForDatabase;
  readonly operators: {
    readonly and: typeof and;
    readonly eq: typeof eq;
    readonly count: typeof count;
    readonly countDistinct: typeof countDistinct;
  };
  readonly codec: { readonly parse: typeof parse; readonly stringify: typeof stringify };
  readonly createId: typeof createId;
  readonly Stopwatch: new () => Pick<Stopwatch, "getElapsedInHumanWords">;
  readonly clock: { now(): Date };
  readonly logger: {
    info(message: string): void;
    warn(message: string, metadata: { error: unknown }): void;
  };
  readonly homarrVersion: string;
  readonly osPlatform: string;
  readonly osArch: string;
  readonly isPostgresql: typeof isPostgresql;
  noExternalConnection(): boolean;
  dockerEnabled(): boolean;
  kubernetesEnabled(): boolean;
  isProviderEnabled(provider: "credentials" | "oidc" | "ldap"): boolean;
  uptime(): number;
  createPostHogClient(): AnalyticsClient;
}

export interface AnalyticsSnapshotService {
  sendServerAnalyticsAsync(db: Database): Promise<AnalyticsResult>;
}

export interface AnalyticsProcedureResources {
  readonly analytics: AnalyticsSnapshotService;
  readonly noExternalConnection: AnalyticsSnapshotResources["noExternalConnection"];
}
