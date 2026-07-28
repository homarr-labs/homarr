import type { WidgetKind } from "@homarr/definitions";

export const shouldPrefetchWidgetForRequest = (kind: WidgetKind, deviceType: string | undefined) => {
  const isMobileDevice = deviceType === "mobile" || deviceType === "tablet";

  return kind !== "downloads" || !isMobileDevice;
};
