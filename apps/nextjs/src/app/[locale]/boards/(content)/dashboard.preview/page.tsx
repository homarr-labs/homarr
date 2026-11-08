import { ClientBoard } from "../_client";
import { WidgetResourcePreload } from "../_widget-resource-preload";

export default function HealthDashboardFixturePage() {
  return (
    <>
      <WidgetResourcePreload kinds={["healthMonitoring"]} />
      <ClientBoard />
    </>
  );
}
