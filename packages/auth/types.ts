import type { DefaultSession } from "@auth/core/types";

import type { ColorScheme, GroupPermissionKey } from "@homarr/definitions";

export type { Session } from "@auth/core/types";

declare module "@auth/core/types" {
  interface Session {
    user: {
      id: string;
      permissions: GroupPermissionKey[];
      colorScheme: ColorScheme;
    } & DefaultSession["user"];
  }
}
