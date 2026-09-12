import type { Session } from "@homarr/auth";
import type { Database } from "@homarr/db";
import type { customWidgetArtifacts, customWidgetInstallations } from "@homarr/db/schema";

export interface PackageContext {
  db: Database;
  session: Session | null;
  crossSiteRequest?: boolean;
}

export type PackageInstallation = typeof customWidgetInstallations.$inferSelect;
export type PackageArtifactRow = typeof customWidgetArtifacts.$inferSelect;
export type ConnectionBindings = Record<string, string>;

export interface PackagePlacementOptions {
  definitionId: string;
  configuration: Record<string, unknown>;
  connectionBindings: ConnectionBindings;
}
