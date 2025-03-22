import type { Session } from "next-auth";

import type { BoardPermission } from "@homarr/definitions";

export type BoardPermissionsProps = (
  | {
      creator: {
        id: string;
      } | null;
    }
  | {
      creatorId: string | null;
    }
) & {
  userPermissions: {
    permission: BoardPermission;
  }[];
  groupPermissions: {
    permission: BoardPermission;
  }[];
  isPublic: boolean;
};

export const constructBoardPermissions = (board: BoardPermissionsProps, session: Session | null) => {
  const creatorId = "creator" in board ? board.creator?.id : board.creatorId;

  return {
    hasFullAccess:
      session?.user.id === creatorId ||
      board.userPermissions.some(({ permission }) => permission === "full") ||
      board.groupPermissions.some(({ permission }) => permission === "full") ||
      (session?.user.permissions.includes("board-full-all") ?? false),
    hasChangeAccess:
      session?.user.id === creatorId ||
      board.userPermissions.some(({ permission }) => permission === "modify" || permission === "full") ||
      board.groupPermissions.some(({ permission }) => permission === "modify" || permission === "full") ||
      (session?.user.permissions.includes("board-modify-all") ?? false) ||
      (session?.user.permissions.includes("board-full-all") ?? false),
    hasViewAccess:
      session?.user.id === creatorId ||
      board.userPermissions.length >= 1 ||
      board.groupPermissions.length >= 1 ||
      board.isPublic ||
      (session?.user.permissions.includes("board-view-all") ?? false),
  };
};
