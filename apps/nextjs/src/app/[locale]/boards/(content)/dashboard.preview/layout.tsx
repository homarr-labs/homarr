import type { PropsWithChildren } from "react";

import { createBoardLayout } from "../../_layout-creator";
import { HealthDashboardFixtureProvider } from "../[name]/(board)/dashboard.preview/_client";
import { getHealthDashboardFixtureAsync } from "./_board";

const FixtureBoardLayout = createBoardLayout({
  getInitialBoardAsync: getHealthDashboardFixtureAsync,
  withCustomCss: false,
});

export default async function HealthDashboardFixtureLayout({
  children,
  params,
}: PropsWithChildren<{ params: Promise<{ locale: string }> }>) {
  const board = await getHealthDashboardFixtureAsync();
  return (
    <HealthDashboardFixtureProvider board={board}>
      <FixtureBoardLayout params={params}>{children}</FixtureBoardLayout>
    </HealthDashboardFixtureProvider>
  );
}
