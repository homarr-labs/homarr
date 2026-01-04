import IconCode from "@tabler/icons-react/icons/IconCode";
import IconGrid3x3 from "@tabler/icons-react/icons/IconGrid3x3";
import IconKey from "@tabler/icons-react/icons/IconKey";
import IconLink from "@tabler/icons-react/icons/IconLink";
import IconMessage from "@tabler/icons-react/icons/IconMessage";
import IconPassword from "@tabler/icons-react/icons/IconPassword";
import IconPasswordUser from "@tabler/icons-react/icons/IconPasswordUser";
import IconPlug from "@tabler/icons-react/icons/IconPlug";
import IconServer from "@tabler/icons-react/icons/IconServer";
import IconUser from "@tabler/icons-react/icons/IconUser";

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
  url: IconLink,
  opnsenseApiKey: IconKey,
  opnsenseApiSecret: IconPassword,
  githubAppId: IconCode,
  githubInstallationId: IconPlug,
  privateKey: IconKey,
} satisfies Record<IntegrationSecretKind, TablerIcon>;
