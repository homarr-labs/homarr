import { cache } from "react";

import { db, eq } from "@homarr/db";
import { users } from "@homarr/db/schema";

// Keep the authenticated user lookup shared across nested RSC layouts. React
// clears this memo between requests, so authorization changes cannot leak.
export const getRscUserSettingsAsync = cache(async (userId: string) =>
  db.query.users.findFirst({
    columns: {
      homeBoardId: true,
      mobileHomeBoardId: true,
      firstDayOfWeek: true,
      pingIconsEnabled: true,
      enableRightClickOnWidgets: true,
      headerPreferences: true,
      defaultSearchEngineId: true,
      openSearchInNewTab: true,
      ddgBangs: true,
      completedManageTour: true,
      completedBoardTour: true,
    },
    where: eq(users.id, userId),
  }),
);
