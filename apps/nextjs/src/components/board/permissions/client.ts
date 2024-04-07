import { useSession } from "@homarr/auth/client";

import type { BoardPermissionsProps } from "./shared";
import { constructPermissions } from "./shared";

export const useBoardPermissions = (props: BoardPermissionsProps) => {
  const { data: session } = useSession();
  return constructPermissions(props, session);
};
