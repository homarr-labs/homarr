import type { IntegrationSecretKind } from "@homarr/definitions";
import type { TablerIconsProps } from "@homarr/ui";
import { IconKey, IconPassword, IconUser } from "@homarr/ui";

export const integrationSecretIcons = {
  username: IconUser,
  apiKey: IconKey,
  password: IconPassword,
} satisfies Record<
  IntegrationSecretKind,
  (props: TablerIconsProps) => JSX.Element
>;
