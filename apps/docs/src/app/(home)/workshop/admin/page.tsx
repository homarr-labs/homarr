import type { Metadata } from "next";

import { WorkshopAdminRoute } from "@/components/workshop/WorkshopRoutes";

export const metadata: Metadata = {
  title: "Workshop moderation",
  robots: { index: false, follow: false },
};

export default function WorkshopAdminPage() {
  return <WorkshopAdminRoute configuredWorkshopUrl={process.env.WORKSHOP_API_URL ?? process.env.WORKSHOP_URL ?? ""} />;
}
