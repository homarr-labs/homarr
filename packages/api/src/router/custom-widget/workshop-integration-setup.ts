import { TRPCError } from "@trpc/server";

import { eq } from "@homarr/db";
import type { Database } from "@homarr/db";
import { integrations } from "@homarr/db/schema";
import { getCustomWidgetIntegrationOptionIds } from "@homarr/custom-widgets/core";
import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";

/** Called only from the administrator-owned installation procedure. Execution
 * independently enforces the current board user's integration permissions. */
export async function configureWorkshopIntegrations(
  db: Database,
  widget: HomarrCustomWidgetV2,
  values: Record<string, string>,
) {
  const optionIds = getCustomWidgetIntegrationOptionIds(widget);
  const options = { ...widget.options };
  for (const [optionId, integrationId] of Object.entries(values)) {
    const option = options[optionId];
    if (!option || !optionIds.has(optionId)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown integration option '${optionId}'` });
    }
    const integration = await db.query.integrations.findFirst({
      where: eq(integrations.id, integrationId),
      columns: { id: true, kind: true },
    });
    if (!integration || (option.integrationKinds && !option.integrationKinds.includes(integration.kind))) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Integration is incompatible with option '${optionId}'` });
    }
    options[optionId] = { ...option, default: integration.id };
  }
  return options;
}
