import { resolve } from "node:path";
import { env } from "../../../env";

export function getWidgetPackageDirectory() {
  const defaultPath = process.env.NODE_ENV === "production" ? "/appdata/custom-widgets" : "./appdata/custom-widgets";
  // Runtime archives and dependency caches live on the owner's writable data volume.
  return resolve(/* turbopackIgnore: true */ env.CUSTOM_WIDGET_PACKAGE_PATH ?? defaultPath);
}
