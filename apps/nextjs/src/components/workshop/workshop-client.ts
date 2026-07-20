import { WorkshopClient, WORKSHOP_API_URL } from "@homarr/workshop";

let browserClient: WorkshopClient | undefined;

export function createWorkshopClient() {
  if (typeof document === "undefined") return new WorkshopClient(WORKSHOP_API_URL);
  if (browserClient) return browserClient;

  const runtimeUrl = document.querySelector<HTMLMetaElement>('meta[name="homarr-workshop-api-url"]')?.content;

  browserClient = new WorkshopClient(runtimeUrl || WORKSHOP_API_URL);
  return browserClient;
}
