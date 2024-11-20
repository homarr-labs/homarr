import dayjs from "dayjs";
import SuperJSON from "superjson";

import type { Modify } from "@homarr/common/types";
import { EVERY_MINUTE } from "@homarr/cron-jobs-core/expressions";
import { db } from "@homarr/db";
import { getItemsWithIntegrationsAsync } from "@homarr/db/queries";
import { integrationCreatorFromSecrets } from "@homarr/integrations";
import type { CalendarEvent } from "@homarr/integrations/types";
import { createItemAndIntegrationChannel } from "@homarr/redis";

// This import is done that way to avoid circular dependencies.
import type { WidgetComponentProps } from "../../../../widgets";
import { createCronJob } from "../../lib";

export const mediaOrganizerJob = createCronJob("mediaOrganizer", EVERY_MINUTE).withCallback(async () => {
  const itemsForIntegration = await getItemsWithIntegrationsAsync(db, {
    kinds: ["calendar"],
  });

  for (const itemForIntegration of itemsForIntegration) {
    for (const { integration } of itemForIntegration.integrations) {
      const options = SuperJSON.parse<WidgetComponentProps<"calendar">["options"]>(itemForIntegration.options);

      const start = dayjs().subtract(Number(options.filterPastMonths), "months").toDate();
      const end = dayjs().add(Number(options.filterFutureMonths), "months").toDate();

      //Asserting the integration kind until all of them get implemented
      const integrationInstance = integrationCreatorFromSecrets(
        integration as Modify<typeof integration, { kind: "sonarr" | "radarr" | "lidarr" | "readarr" }>,
      );

      const events = await integrationInstance.getCalendarEventsAsync(start, end);

      const cache = createItemAndIntegrationChannel<CalendarEvent[]>("calendar", integration.id);
      await cache.setAsync(events);
    }
  }
});
