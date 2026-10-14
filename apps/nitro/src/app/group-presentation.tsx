import { createDocumentationLink } from "@homarr/definitions";
import { UserAvatar, UserAvatarGroup } from "@homarr/ui";

import { SourceLink } from "../navigation/source-bridge";
import type { GroupPresentation } from "../source-ui/groups/contracts";

export const privateGroupDocumentationHref = createDocumentationLink("/docs/management/users", "#special-groups");

export function createPrivateGroupPresentation(documentationHref: string): GroupPresentation {
  return {
    linkComponent: SourceLink,
    documentationHref,
    renderAvatar: (user, size) => <UserAvatar user={user} size={size} />,
    renderAvatarGroup: (users, size, limit) => <UserAvatarGroup users={users} size={size} limit={limit} />,
  };
}
