import { notFound } from "next/navigation";

import { getBoardByNameAsync } from "@homarr/api/board-server";
import { getLayoutIdForViewportWidth } from "@homarr/boards/layout-selection";

import { getInitialViewportWidthAsync } from "../../../../_layout-creator";
import { WidgetResourcePreload } from "../../../_widget-resource-preload";
import { HealthDashboardClient } from "./_client";

export default async function HealthDashboardPage({ params }: { params: Promise<{ name: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { name } = await params;
  if (name !== "health-monitoring") notFound();
  const [board, viewportWidth] = await Promise.all([getBoardByNameAsync(name), getInitialViewportWidthAsync()]);
  const layoutId = getLayoutIdForViewportWidth(board.layouts, viewportWidth);
  return (
    <>
      <WidgetResourcePreload kinds={["healthMonitoring"]} />
      <HealthDashboardClient board={board} layoutId={layoutId} viewportWidth={viewportWidth} />
    </>
  );
}
