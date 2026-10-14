import { ORPCError } from "@orpc/server";

import type { BackendPrincipal } from "../../context";

export function assertMediaDeletionAuthorized(
  principal: BackendPrincipal,
  media: { readonly id: string; readonly creatorId: string | null } | undefined,
): void {
  if (principal.kind !== "authenticated") throw new ORPCError("UNAUTHORIZED");
  if (!media) throw new ORPCError("NOT_FOUND", { message: "Media not found" });
  if (!principal.user.permissions.includes("media-full-all") && principal.user.id !== media.creatorId)
    throw new ORPCError("FORBIDDEN", { message: "You don't have permission to delete this media" });
}
