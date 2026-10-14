import type { FunctionComponent, ReactNode } from "react";
import type { IdentitySettingsLinkProps } from "../../../../../packages/ui/src/source-views/identity-settings/contracts";

export interface GroupUserPresentation {
  id: string;
  name: string | null;
  image: string | null;
  email?: string | null;
}

export interface GroupPresentation {
  linkComponent: FunctionComponent<IdentitySettingsLinkProps>;
  documentationHref: string;
  renderAvatar: (user: GroupUserPresentation, size: "xs" | "sm" | "lg") => ReactNode;
  renderAvatarGroup: (users: GroupUserPresentation[], size: "sm", limit: number) => ReactNode;
}

export type GroupSection = "general" | "settings" | "members" | "permissions";

export const groupWriteHold =
  "Group writes are unavailable until authenticated authority, compatible SQL writers and request lifetime bindings are accepted. Drafts do not change stored grants or memberships.";
