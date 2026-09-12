import { EventEmitter } from "node:events";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { createSubPubChannel } from "@homarr/redis";

export interface WidgetPackageChange {
  installationId: string;
  itemIds: string[];
  kind: "activation" | "disabled" | "bindings" | "storage";
}
const logger = createLogger({ module: "widget-packages" });
const local = new EventEmitter();
local.setMaxListeners(0);
let channel: ReturnType<typeof createSubPubChannel<WidgetPackageChange>> | undefined;
const useLocal = () => process.env.CI !== undefined || process.env.NODE_ENV === "test";

export function observeWidgetPackageChanges(callback: (change: WidgetPackageChange) => void) {
  if (useLocal()) {
    local.on("change", callback);
    return () => {
      local.off("change", callback);
    };
  }
  channel ??= createSubPubChannel<WidgetPackageChange>("widget-package-changes", { persist: false });
  return channel.subscribe(callback);
}

export async function publishWidgetPackageChange(change: WidgetPackageChange) {
  if (useLocal()) {
    local.emit("change", change);
    return;
  }
  channel ??= createSubPubChannel<WidgetPackageChange>("widget-package-changes", { persist: false });
  // The managed change is already committed. Never report a mutation failure that encourages replay.
  await channel
    .publishAsync(change)
    .catch(() => logger.warn("Widget change notification unavailable", { installationId: change.installationId }));
}
