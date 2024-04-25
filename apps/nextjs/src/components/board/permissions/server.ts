import { auth } from "@homarr/auth";
import type { BoardPermissionsProps } from "@homarr/auth/shared";
import { constructBoardPermissions } from "@homarr/auth/shared";

export const getBoardPermissions = async (board: BoardPermissionsProps) => {
  const session = await auth();
  return constructBoardPermissions(board, session);
};
