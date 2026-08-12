import { WorkshopBackend } from "@homarr/workshop/backend";
import { WORKSHOP_API_URL, WORKSHOP_WEB_URL } from "@homarr/workshop/schema";

let browserClient: WorkshopBackend | undefined;

export function getWorkshopApiUrl() {
  const runtimeUrl =
    typeof document === "undefined"
      ? undefined
      : document.querySelector<HTMLMetaElement>('meta[name="homarr-workshop-api-url"]')?.content;
  return (runtimeUrl || WORKSHOP_API_URL).replace(/\/+$/u, "");
}

export function getWorkshopAssistantProviderUrl() {
  return `${getWorkshopApiUrl()}/api/ai/v1`;
}

export function createWorkshopClient() {
  if (typeof document === "undefined") return new WorkshopBackend(getWorkshopApiUrl());
  if (browserClient) return browserClient;

  browserClient = new WorkshopBackend(getWorkshopApiUrl());
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
