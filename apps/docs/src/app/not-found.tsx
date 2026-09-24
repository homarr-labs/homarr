import { HomeLayout } from "fumadocs-ui/layouts/home";

import { WorkshopNotFoundRouter } from "@/components/workshop/WorkshopNotFoundRouter";
import { baseOptions } from "@/lib/layout.shared";

export default function NotFoundPage() {
  return (
    <HomeLayout {...baseOptions()}>
      <WorkshopNotFoundRouter configuredWorkshopUrl={process.env.WORKSHOP_API_URL ?? process.env.WORKSHOP_URL ?? ""} />
    </HomeLayout>
  );
}
