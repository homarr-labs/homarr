import type { Session } from "@homarr/auth";
import type { BoardPermission } from "@homarr/definitions";

export interface BoardPermissionsProps {
  creatorId: string | null;
  permissions: BoardPermission[];
}

export const constructPermissions = (
  { creatorId, permissions }: BoardPermissionsProps,
  session: Session | null,
) => ({
  hasFullAccess: session?.user.id === creatorId,
  hasChangeAccess:
    session?.user.id === creatorId || permissions.includes("board-change"),
  hasViewAccess: session?.user.id === creatorId || permissions.length >= 1,
});
