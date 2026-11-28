import { notFound } from "next/navigation";

import { HealthMonitoringPreview } from "@homarr/widgets/health-monitoring/rework";
import { createHealthDashboardFixture } from "@homarr/widgets/health-monitoring/rework/dashboard";

export default async function HealthMonitoringPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ fixture?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const params = await searchParams;
  const board = createHealthDashboardFixture();
  return <HealthMonitoringPreview initialScenario={params.fixture} baselineBoard={board} />;
}
