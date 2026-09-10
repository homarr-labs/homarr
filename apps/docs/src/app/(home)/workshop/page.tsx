import type { Metadata } from "next";

import { WorkshopListingFallback } from "@/components/workshop/WorkshopApp";
import { WorkshopErrorBoundary } from "@/components/workshop/WorkshopErrorBoundary";
import { WorkshopRoute } from "@/components/workshop/WorkshopRoutes";

export const metadata: Metadata = {
  title: "Workshop",
  description: "Community custom CSS and custom widgets for Homarr.",
};

export default function WorkshopPage() {
  const configuredWorkshopUrl = process.env.WORKSHOP_API_URL ?? process.env.WORKSHOP_URL ?? "";

  return (
    <main className="marketplace min-h-[80vh] bg-background text-foreground">
      <WorkshopErrorBoundary>
        <WorkshopRoute configuredWorkshopUrl={configuredWorkshopUrl} />
      </WorkshopErrorBoundary>
      <noscript>
        <WorkshopListingFallback />
      </noscript>
    </main>
  );
}
