import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";

import { and, eq, isNull, sql } from "@homarr/db";
import type { SQLWrapper } from "@homarr/db";
import { isMysql } from "@homarr/db/collection";
import { customWidgetDefinitions } from "@homarr/db/schema";
import type { CustomWidgetDefinition } from "@homarr/db/schema";

function exactText(column: SQLWrapper, value: string | null) {
  if (value === null) return isNull(column);
  // MySQL's default text collation ignores case and trailing whitespace. Both
  // are meaningful in authored code, URLs, IDs, and fingerprints.
  if (isMysql()) return sql`cast(${column} as binary) = cast(${value} as binary)`;
  return sql`${column} = ${value}`;
}

/** Match the state read before an async edit, including Workshop lifecycle changes. */
export function customWidgetDefinitionMatch(row: CustomWidgetDefinition, includeLayout = false) {
  const match = [
    eq(customWidgetDefinitions.id, row.id),
    exactText(customWidgetDefinitions.sources, row.sources),
    exactText(customWidgetDefinitions.requests, row.requests),
    exactText(customWidgetDefinitions.options, row.options),
    exactText(customWidgetDefinitions.template, row.template),
    exactText(customWidgetDefinitions.name, row.name),
    exactText(customWidgetDefinitions.description, row.description),
    exactText(customWidgetDefinitions.iconUrl, row.iconUrl),
    exactText(customWidgetDefinitions.extensions, row.extensions),
    exactText(customWidgetDefinitions.workshopOrigin, row.workshopOrigin),
    exactText(customWidgetDefinitions.previousPackage, row.previousPackage),
  ];
  if (includeLayout) match.push(exactText(customWidgetDefinitions.editorLayout, row.editorLayout));
  return and(...match);
}

/** Read the mutation count from SQLite, MySQL2, and node-postgres results. */
export function assertCustomWidgetDefinitionChanged(result: unknown) {
  let response = result;
  if (Array.isArray(result)) response = result[0];
  const count = response as { changes?: number; affectedRows?: number; rowCount?: number };
  if ((count.changes ?? count.affectedRows ?? count.rowCount) !== 1) {
    throw new TRPCError({ code: "CONFLICT", message: "The saved widget changed. Review it again before saving." });
  }
}

/** Opaque saved-state precondition for workbench tabs; includes local layout. */
export function customWidgetSavedRevision(row: CustomWidgetDefinition) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        row.name,
        row.description,
        row.iconUrl,
        row.sources,
        row.requests,
        row.options,
        row.template,
        row.extensions,
        row.editorLayout,
        row.workshopOrigin,
        row.previousPackage,
      ]),
    )
    .digest("hex");
}
