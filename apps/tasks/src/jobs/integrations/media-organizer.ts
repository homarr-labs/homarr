import dayjs from "dayjs";
import SuperJSON from "superjson";

import { decryptSecret } from "@homarr/common";
import { db, eq } from "@homarr/db";
import { items } from "@homarr/db/schema/sqlite";
import { SonarrIntegration } from "@homarr/integrations";
import { createCacheChannel } from "@homarr/redis";
import type { WidgetComponentProps } from "@homarr/widgets";

import { EVERY_MINUTE } from "~/lib/cron-job/constants";
import { createCronJob } from "~/lib/cron-job/creator";

export const mediaOrganizerJob = createCronJob(EVERY_MINUTE).withCallback(async () => {
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

      const sonarr = new SonarrIntegration({
        ...integration.integration,
        decryptedSecrets: integration.integration.secrets.map((secret) => ({
          ...secret,
          value: decryptSecret(secret.value),
        })),
      });
      const events = await sonarr.getCalendarEventsAsync(start, end);

      const cache = createCacheChannel(`calendar:${integration.integrationId}`);
      await cache.setAsync(events);
    }
  }
});
