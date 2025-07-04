import {
  IconGrid3x3,
  IconKey,
  IconMessage,
  IconPassword,
  IconPasswordUser,
  IconServer,
  IconUser,
} from "@tabler/icons-react";

import type { IntegrationSecretKind } from "@homarr/definitions";
import type { TablerIcon } from "@homarr/ui";

export const integrationSecretIcons = {
  username: IconUser,
  apiKey: IconKey,
  password: IconPassword,
  realm: IconServer,
  tokenId: IconGrid3x3,
  personalAccessToken: IconPasswordUser,
  topic: IconMessage,
} satisfies Record<IntegrationSecretKind, TablerIcon>;
