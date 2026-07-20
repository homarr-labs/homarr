import { WorkshopClient, WORKSHOP_API_URL } from "@homarr/workshop";

export function createWorkshopClient() {
  const runtimeUrl =
    typeof document === "undefined"
      ? undefined
      : document.querySelector<HTMLMetaElement>('meta[name="homarr-workshop-api-url"]')?.content;

  return new WorkshopClient(runtimeUrl || WORKSHOP_API_URL);
}
