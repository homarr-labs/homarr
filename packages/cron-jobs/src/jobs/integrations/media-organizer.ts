import dayjs from "dayjs";
import SuperJSON from "superjson";

import { decryptSecret } from "@homarr/common";
import { EVERY_MINUTE } from "@homarr/cron-jobs-core/expressions";
import { db, eq } from "@homarr/db";
import { items } from "@homarr/db/schema/sqlite";
import { integrationCreatorByKind } from "@homarr/integrations";
import type { CalendarEvent } from "@homarr/integrations/types";
import { createItemAndIntegrationChannel } from "@homarr/redis";

// This import is done that way to avoid circular dependencies.
import type { WidgetComponentProps } from "../../../../widgets";
import { createCronJob } from "../../lib";

export const mediaOrganizerJob = createCronJob("mediaOrganizer", EVERY_MINUTE).withCallback(async () => {
  const itemsForIntegration = await db.query.items.findMany({
    where: eq(items.kind, "calendar"),
    with: {
      integrations: {
        with: {
          integration: {
            with: {
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

  for (const itemForIntegration of itemsForIntegration) {
    for (const integration of itemForIntegration.integrations) {
      const options = SuperJSON.parse<WidgetComponentProps<"calendar">["options"]>(itemForIntegration.options);

      const start = dayjs().subtract(Number(options.filterPastMonths), "months").toDate();
      const end = dayjs().add(Number(options.filterFutureMonths), "months").toDate();

      const decryptedSecrets = integration.integration.secrets.map((secret) => ({
        ...secret,
        value: decryptSecret(secret.value),
      }));

      const integrationInstance = integrationCreatorByKind(integration.integration.kind as "radarr" | "sonarr", {
        ...integration.integration,
        decryptedSecrets,
      });

      const events = await integrationInstance.getCalendarEventsAsync(start, end);

      const cache = createItemAndIntegrationChannel<CalendarEvent[]>("calendar", integration.integrationId);
      await cache.setAsync(events);
    }
  }
});
