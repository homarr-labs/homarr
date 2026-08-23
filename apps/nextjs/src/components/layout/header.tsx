import type { ReactNode } from "react";
import { auth } from "@homarr/auth/next";
import { env } from "@homarr/docker/env";

import { CurrentUserAvatar } from "~/components/user-avatar";
import { appShellLogoHeight } from "./constants";
import { ConfigurableHeader } from "./header/configurable-header";
import { HomarrLogo } from "./logo/homarr-logo";

interface Props {
  logo?: ReactNode;
  actions?: ReactNode;
  hasNavigation?: boolean;
}

export const MainHeader = async ({ logo, actions, hasNavigation = true }: Props) => {
  const session = await auth();
  const isAdmin = Boolean(session?.user.permissions.includes("admin"));
  const isDockerEnabled = isAdmin && env.ENABLE_DOCKER;

  return (
    <ConfigurableHeader
      logo={logo ?? <HomarrLogo size={appShellLogoHeight} />}
      actions={actions}
      hasNavigation={hasNavigation}
      avatar={<CurrentUserAvatar size="md" />}
      userId={session?.user.id ?? null}
      isAdmin={isAdmin}
      isDockerEnabled={isDockerEnabled}
    />
  );
};
