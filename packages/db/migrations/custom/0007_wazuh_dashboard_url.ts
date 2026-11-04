import { decryptSecret } from "@homarr/common/server";

import type { Database } from "../..";
import { and, eq, executeWritePlanAsync, isNull, sql } from "../..";
import { integrations, integrationSecrets } from "../../schema";

export async function migrateWazuhDashboardUrlAsync(db: Database) {
  const existingIntegrations = await db.query.integrations.findMany({
    where: (table, { eq: equals }) => equals(table.kind, "wazuh"),
    with: {
      secrets: {
        where: (table) => sql`${table.kind} = ${"wazuhDashboardUrl"}`,
      },
    },
  });

  for (const integration of existingIntegrations) {
    const dashboardUrl = integration.secrets.at(0);
    if (!dashboardUrl) continue;

    const plan = [];
    if (integration.externalUrl === null) {
      const externalUrl = decryptSecret(dashboardUrl.value);
      plan.push(sql`UPDATE ${integrations} SET ${sql.identifier("external_url")} = ${externalUrl}
        WHERE ${and(eq(integrations.id, integration.id), isNull(integrations.externalUrl))}`);
    }
    plan.push(sql`DELETE FROM ${integrationSecrets}
      WHERE ${and(eq(integrationSecrets.integrationId, integration.id), sql`${integrationSecrets.kind} = ${"wazuhDashboardUrl"}`)}`);

    await executeWritePlanAsync(db, plan);
  }
}
