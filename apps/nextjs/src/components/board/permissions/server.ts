import { auth } from "@homarr/auth";

import type { BoardPermissionsProps } from "./shared";
import { constructPermissions } from "./shared";

export const getBoardPermissions = async (props: BoardPermissionsProps) => {
  const session = await auth();
  return constructPermissions(props, session);
};
