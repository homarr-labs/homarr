import type { Session } from "next-auth";

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
    permission: string;
  }[];
  groupPermissions: {
    permission: string;
  }[];
  isPublic: boolean;
};

export const constructBoardPermissions = (board: BoardPermissionsProps, session: Session | null) => {
  const creatorId = "creator" in board ? board.creator?.id : board.creatorId;

  return {
    hasFullAccess: session?.user?.id === creatorId || session?.user.permissions.includes("board-full-access"),
    hasChangeAccess:
      session?.user?.id === creatorId ||
      board.userPermissions.some(({ permission }) => permission === "board-change") ||
      board.groupPermissions.some(({ permission }) => permission === "board-change") ||
      session?.user.permissions.includes("board-modify-all"),
    hasViewAccess:
      session?.user?.id === creatorId ||
      board.userPermissions.length >= 1 ||
      board.groupPermissions.length >= 1 ||
      board.isPublic ||
      session?.user.permissions.includes("board-view-all"),
  };
};
