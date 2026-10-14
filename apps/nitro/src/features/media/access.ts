import type { SourceMediaItem, SourceMediaPrincipal } from "./contracts";

export function getSourceMediaAccess(principal: SourceMediaPrincipal, readOnly: boolean) {
  if (principal.kind !== "authenticated") {
    return { canRead: false, canViewAll: false, canUpload: false };
  }
  return {
    canRead: true,
    canViewAll: principal.user.permissions.includes("media-view-all"),
    canUpload: !readOnly && principal.user.permissions.includes("media-upload"),
  };
}

export function canDeleteSourceMedia(
  principal: SourceMediaPrincipal,
  media: Pick<SourceMediaItem, "creatorId">,
  readOnly: boolean,
) {
  return (
    !readOnly &&
    principal.kind === "authenticated" &&
    (media.creatorId === principal.user.id || principal.user.permissions.includes("media-full-all"))
  );
}
