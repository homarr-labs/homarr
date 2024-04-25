import { IconKey, IconPassword, IconUser } from "@tabler/icons-react";

import type { IntegrationSecretKind } from "@homarr/definitions";
import type { TablerIcon } from "@homarr/ui";

export const integrationSecretIcons = {
  username: IconUser,
  apiKey: IconKey,
  password: IconPassword,
} satisfies Record<IntegrationSecretKind, TablerIcon>;
