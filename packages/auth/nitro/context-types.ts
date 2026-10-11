import type { DefaultSession } from "@auth/core/types";
import type { ColorScheme, GroupPermissionKey } from "@homarr/definitions";

export type SessionUser = DefaultSession["user"] & {
  id: string;
  permissions: GroupPermissionKey[];
  colorScheme: ColorScheme;
};
