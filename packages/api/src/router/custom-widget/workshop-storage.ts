import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";

import { eq } from "@homarr/db";
import type { Database } from "@homarr/db";
import { customWidgetDefinitions } from "@homarr/db/schema";
import type { CustomWidgetDefinition } from "@homarr/db/schema";
import { parseCustomWidgetWorkshopOrigin } from "@homarr/custom-widgets/core";

import { parseStoredCustomWidgetDefinition } from "./stored-definition";
import { assertCustomWidgetDefinitionChanged, customWidgetDefinitionMatch } from "./stored-definition-state";
import { widgetFingerprint, workshopUrls } from "./workshop-service";

export async function getWorkshopInstalled(db: Database, id: string, requireConfiguredEndpoint = true) {
  const row = await db.query.customWidgetDefinitions.findFirst({ where: eq(customWidgetDefinitions.id, id) });
  if (!row) throw new TRPCError({ code: "NOT_FOUND" });
  const origin = parseCustomWidgetWorkshopOrigin(row.workshopOrigin);
  if (!origin || (requireConfiguredEndpoint && origin.endpoint !== workshopUrls.workshopApiUrl)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This widget is not linked to the configured Workshop" });
  }
  return { row, origin, widget: parseStoredCustomWidgetDefinition(row) };
}

/** Pin the reviewed package and its lifecycle metadata, excluding layout and credentials. */
export function workshopInstalledState(row: CustomWidgetDefinition) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        widgetFingerprint(parseStoredCustomWidgetDefinition(row)),
        row.workshopOrigin,
        row.previousPackage,
      ]),
    )
    .digest("hex");
}

export function assertWorkshopReviewedState(row: CustomWidgetDefinition, expectedState: string) {
  if (workshopInstalledState(row) !== expectedState) {
    throw new TRPCError({ code: "CONFLICT", message: "The installed widget changed. Review it again." });
  }
}

/** One SQL compare-and-swap covers the async fetch-to-write window on every driver. */
export async function replaceWorkshopInstalled(
  db: Database,
  row: CustomWidgetDefinition,
  changes: Partial<CustomWidgetDefinition>,
) {
  const result: unknown = await db
    .update(customWidgetDefinitions)
    .set({ ...changes, updatedAt: new Date() })
    .where(customWidgetDefinitionMatch(row));
  assertCustomWidgetDefinitionChanged(result);
}
