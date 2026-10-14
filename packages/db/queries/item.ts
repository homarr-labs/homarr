import type { WidgetKind } from "@homarr/definitions";

import type { Database } from "..";
import { inArray } from "..";
import type { inferSupportedIntegrations } from "@homarr/definitions/widget-integration-contracts";
import { getSchemaForDatabase } from "../schema";

export const getItemsWithIntegrationsAsync = async <TKind extends WidgetKind>(
  db: Database,
  { kinds }: { kinds: TKind[] },
) => {
  const { items } = getSchemaForDatabase(db);
  const itemsForIntegration = await db.query.items.findMany({
    where: inArray(items.kind, kinds),
    with: {
      integrations: {
        with: {
          integration: {
            with: {
              app: true,
              secrets: {
                columns: {
                  kind: true,
                  value: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return itemsForIntegration.map((item) => ({
    ...item,
    kind: item.kind as TKind,
    integrations: item.integrations.map(({ integration, integrationId }) => {
      const integrationWithSecrets = {
        ...integration,
        kind: integration.kind as inferSupportedIntegrations<TKind>,
      };

      return {
        integration: integrationWithSecrets,
        integrationId,
      };
    }),
  }));
};
