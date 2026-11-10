import { notFound } from "next/navigation";

import { api } from "@homarr/api/server";
import { HealthMonitoringPreview } from "@homarr/widgets/health-monitoring/rework";

export default async function HealthMonitoringPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ fixture?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const params = await searchParams;
  const board = await api.board.getBoardByName({ name: "default" });
  return <HealthMonitoringPreview initialScenario={params.fixture} baselineBoard={board} />;
}
