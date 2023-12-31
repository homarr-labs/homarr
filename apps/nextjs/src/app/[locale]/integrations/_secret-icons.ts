import type { IntegrationSecretSort } from "@homarr/db/schema/items";
import type { TablerIconsProps } from "@homarr/ui";
import { IconKey, IconPassword, IconUser } from "@homarr/ui";

export const integrationSecretIcons = {
  username: IconUser,
  apiKey: IconKey,
  password: IconPassword,
} satisfies Record<
  IntegrationSecretSort,
  (props: TablerIconsProps) => JSX.Element
>;
