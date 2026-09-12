import type { IntegrationKind, WidgetKind } from "@homarr/definitions";

/** Small metadata only: native menus never import package source or the trusted widget runtime. */
export function getNativeWidgetReferenceStarter(kind: WidgetKind, integrationKinds: readonly IntegrationKind[] = []) {
  if (kind === "clock") return "clock";
  if (kind === "timer") return "timer";
  if (kind === "downloads") return "downloads";
  if (kind === "mediaServer") return "media";
  if (kind === "beszelSystemGrid" || kind === "beszelSystemTable" || kind === "beszelSystemStats") return "beszel";
  if (
    (kind === "calendar" || kind === "mediaMissing") &&
    integrationKinds.length === 1 &&
    integrationKinds[0] === "sonarr"
  )
    return "sonarr";
  return undefined;
}
