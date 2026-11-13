import {
  IconCode,
  IconGrid3x3,
  IconKey,
  IconLink,
  IconMessage,
  IconPassword,
  IconShieldLock,
  IconPasswordUser,
  IconPlug,
  IconServer,
  IconTag,
  IconUser,
} from "@tabler/icons-react";

import type { IntegrationCredentialKind } from "@homarr/definitions";
import type { TablerIcon } from "@homarr/ui";

export const integrationSecretIcons = {
  username: IconUser,
  apiKey: IconKey,
  password: IconPassword,
  realm: IconServer,
  tokenId: IconGrid3x3,
  personalAccessToken: IconPasswordUser,
  topic: IconMessage,
  url: IconLink,
  opnsenseApiKey: IconKey,
  opnsenseApiSecret: IconPassword,
  patchmonApiKey: IconKey,
  patchmonApiSecret: IconPassword,
  githubAppId: IconCode,
  githubInstallationId: IconPlug,
  privateKey: IconKey,
  slug: IconTag,
  wazuhIndexerUrl: IconLink,
  wazuhIndexerUsername: IconUser,
  wazuhIndexerPassword: IconPassword,
  totpSecret: IconShieldLock,
} satisfies Record<IntegrationCredentialKind, TablerIcon>;
