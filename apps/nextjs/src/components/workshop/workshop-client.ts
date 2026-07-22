import { WorkshopBackend } from "@homarr/workshop/backend";
import { WORKSHOP_API_URL } from "@homarr/workshop/schema";

let browserClient: WorkshopBackend | undefined;

export function createWorkshopClient() {
  if (typeof document === "undefined") return new WorkshopBackend(WORKSHOP_API_URL);
  if (browserClient) return browserClient;

  const runtimeUrl = document.querySelector<HTMLMetaElement>('meta[name="homarr-workshop-api-url"]')?.content;

  browserClient = new WorkshopBackend(runtimeUrl || WORKSHOP_API_URL);
  return browserClient;
}
