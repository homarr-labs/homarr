import type { Database } from "@homarr/db";

import { formatEntityExport } from "../formats/json-format";
import type { EntityExport } from "../types";

/**
 * Options for integration export
 */
export interface IntegrationExportOptions {
  /** Whether to include secrets in the export */
  includeSecrets?: boolean;
}

/**
 * Service for exporting individual integrations
 */
export class IntegrationExporter {
  constructor(private readonly db: Database) {}

  /**
   * Exports a single integration
   */
  async exportAsync(integrationId: string, options: IntegrationExportOptions = {}): Promise<EntityExport<unknown>> {
    const integration = await this.db.query.integrations.findFirst({
      where: (integrations, { eq }) => eq(integrations.id, integrationId),
      with: {
        secrets: options.includeSecrets ? true : undefined,
        userPermissions: true,
        groupPermissions: true,
      },
    });

    if (!integration) {
      throw new Error(`Integration with ID ${integrationId} not found`);
    }

    return formatEntityExport("integration", integration);
  }
}

/**
 * Generates a filename for an integration export
 */
export const generateIntegrationExportFileName = (integrationName: string): string => {
  const sanitizedName = integrationName.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();
  const timestamp = Date.now();
  return `integration-${sanitizedName}-${timestamp}.json`;
};
