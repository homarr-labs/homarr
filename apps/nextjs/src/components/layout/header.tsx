import type { ReactNode } from "react";
import { auth } from "@homarr/auth/next";
import { env } from "@homarr/docker/env";

import { CurrentUserAvatar } from "~/components/user-avatar";
import { appShellLogoHeight } from "./constants";
import { ConfigurableHeader } from "./header/configurable-header";
import { HomarrLogo, HomarrLogoWithTitle } from "./logo/homarr-logo";

interface Props {
  logo?: ReactNode;
  logoWithTitle?: ReactNode;
  actions?: ReactNode;
  boardEditAction?: ReactNode;
  boardSettingsAction?: ReactNode;
  hasNavigation?: boolean;
}

export const MainHeader = async ({
  logo,
  logoWithTitle,
  actions,
  boardEditAction,
  boardSettingsAction,
  hasNavigation = true,
}: Props) => {
  const session = await auth();
  const isAdmin = Boolean(session?.user.permissions.includes("admin"));
  const isDockerEnabled = isAdmin && env.ENABLE_DOCKER;
  const resolvedLogoWithTitle = logoWithTitle ?? <HomarrLogoWithTitle size="md" />;

  return (
    <ConfigurableHeader
      logo={logo ?? <HomarrLogo size={appShellLogoHeight} />}
      logoWithTitle={resolvedLogoWithTitle}
      actions={actions}
      boardEditAction={boardEditAction}
      boardSettingsAction={boardSettingsAction}
      hasNavigation={hasNavigation}
      avatar={<CurrentUserAvatar size="md" />}
      userId={session?.user.id ?? null}
      isAdmin={isAdmin}
      isDockerEnabled={isDockerEnabled}
    />
  );
};
