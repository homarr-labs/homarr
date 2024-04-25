import type { Session } from "@auth/core/types";

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
  permissions: {
    permission: string;
  }[];
  isPublic: boolean;
};

// TODO: add unit tests
export const constructBoardPermissions = (
  board: BoardPermissionsProps,
  session: Session | null,
) => {
  const creatorId = "creator" in board ? board.creator?.id : board.creatorId;

  return {
    hasFullAccess: session?.user?.id === creatorId,
    hasChangeAccess:
      session?.user?.id === creatorId ||
      board.permissions.some(({ permission }) => permission === "board-change"),
    hasViewAccess:
      session?.user?.id === creatorId ||
      board.permissions.length >= 1 ||
      board.isPublic,
  };
};
