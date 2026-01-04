import { inArray } from "drizzle-orm";

import type { Database } from "@homarr/db";
import { integrations } from "@homarr/db/schema";

import { formatEntityExport } from "../formats/json-format";
import type { BoardExportOptions, EntityExport } from "../types";

/**
 * Service for exporting individual boards
 */
export class BoardExporter {
  constructor(private readonly db: Database) {}

  /**
   * Exports a single board with all related data
   */
  async exportAsync(boardId: string, options: BoardExportOptions = {}): Promise<EntityExport<unknown>> {
    const board = await this.db.query.boards.findFirst({
      where: (boards, { eq }) => eq(boards.id, boardId),
      with: {
        sections: true,
        items: {
          with: {
            integrations: true,
            layouts: true,
          },
        },
        layouts: {
          with: {
            items: true,
            sections: true,
          },
        },
        userPermissions: true,
        groupPermissions: true,
      },
    });

    if (!board) {
      throw new Error(`Board with ID ${boardId} not found`);
    }

    let exportData: { board: typeof board; integrations?: unknown[] } = { board };

    // Optionally include referenced integrations
    if (options.includeIntegrations) {
      const referencedIntegrations = await this.getReferencedIntegrationsAsync(board.items);
      exportData = { ...exportData, integrations: referencedIntegrations };
    }

    return formatEntityExport("board", exportData);
  }

  /**
   * Gets integrations referenced by board items
   */
  private async getReferencedIntegrationsAsync(items: { integrations: { integrationId: string }[] }[]) {
    const integrationIds = new Set<string>();
    for (const item of items) {
      for (const integration of item.integrations) {
        integrationIds.add(integration.integrationId);
      }
    }

    if (integrationIds.size === 0) {
      return [];
    }

    return this.db.query.integrations.findMany({
      where: inArray(integrations.id, [...integrationIds]),
      with: {
        secrets: true,
      },
    });
  }
}

/**
 * Generates a filename for a board export
 */
export const generateBoardExportFileName = (boardName: string): string => {
  const sanitizedName = boardName.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();
  const timestamp = Date.now();
  return `board-${sanitizedName}-${timestamp}.json`;
};
