import { WorkshopBackend } from "@homarr/workshop/backend";
import { WORKSHOP_API_URL, WORKSHOP_WEB_URL } from "@homarr/workshop/schema";

let browserClient: WorkshopBackend | undefined;

export function createWorkshopClient() {
  if (typeof document === "undefined") return new WorkshopBackend(WORKSHOP_API_URL);
  if (browserClient) return browserClient;

  const runtimeUrl = document.querySelector<HTMLMetaElement>('meta[name="homarr-workshop-api-url"]')?.content;

  browserClient = new WorkshopBackend(runtimeUrl || WORKSHOP_API_URL);
  return browserClient;
}

export function getWorkshopWebUrl(submissionId?: string) {
  const runtimeUrl =
    typeof document === "undefined"
      ? undefined
      : document.querySelector<HTMLMetaElement>('meta[name="homarr-workshop-web-url"]')?.content;
  const workshopUrl = (runtimeUrl || WORKSHOP_WEB_URL).replace(/\/+$/u, "");
  return submissionId ? `${workshopUrl}/${encodeURIComponent(submissionId)}` : workshopUrl;
}
