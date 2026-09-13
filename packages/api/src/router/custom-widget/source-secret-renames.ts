import { TRPCError } from "@trpc/server";

import { createId } from "@homarr/common";
import type { CustomWidgetSource } from "@homarr/custom-widgets/core";

import { hasSameSecretBinding } from "./secret-policy";

/** Move stored ciphertext in the save transaction; never read and later recreate
 * a credential that another operation may have cleared in the meantime. */
export function prepareSourceSecretRenames(
  previous: Record<string, CustomWidgetSource>,
  incoming: Record<string, CustomWidgetSource>,
  renames: Record<string, string> = {},
) {
  const targets = new Set(Object.values(renames));
  return Object.entries(renames).map(([from, to]) => {
    const source = previous[from];
    const destination = incoming[to];
    if (
      from === to ||
      !source ||
      !destination ||
      (previous[to] && !Object.hasOwn(renames, to)) ||
      (incoming[from] && !targets.has(from))
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Source rename does not match the saved and submitted source identities",
      });
    }
    if (!hasSameSecretBinding(source, destination)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Renamed source security settings changed; re-enter its credentials",
      });
    }
    return { from, to, temporary: `rename-${createId()}` };
  });
}
