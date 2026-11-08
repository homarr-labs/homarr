import { cache } from "react";
import { notFound } from "next/navigation";

import { getBoardByNameAsync } from "@homarr/api/board-server";
import { createHealthDashboardFixture } from "@homarr/widgets/health-monitoring/rework/dashboard";

export const getHealthDashboardFixtureAsync = cache(async () => {
  if (process.env.NODE_ENV !== "development") notFound();
  return createHealthDashboardFixture(await getBoardByNameAsync("default"));
});
