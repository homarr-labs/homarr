import { shareLink as createShareLink } from "@homarr/worker-client/connection";
import type { SavedWorker } from "@homarr/worker-client/connection";

import { appHome } from "./base-path";

export * from "@homarr/worker-client/connection";

export function shareLink(worker: SavedWorker, token: string, kind: "share" | "invite", name: string): string {
  return createShareLink(worker, token, kind, name, appHome);
}
