import type { ReactNode } from "react";
import type { Session } from "@homarr/auth";
import { auth } from "@homarr/auth/next";
import { env } from "@homarr/docker/env";
import { UserAvatar } from "@homarr/ui";

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

export const MainHeader = async (props: Props) => <MainHeaderView {...props} session={await auth()} />;

export const MainHeaderView = ({
  logo,
  logoWithTitle,
  actions,
  boardEditAction,
  boardSettingsAction,
  hasNavigation = true,
  session,
}: Props & { session: Session | null }) => {
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
      avatar={
        <UserAvatar
          size="md"
          user={{
            name: session?.user.name ?? null,
            email: session?.user.email ?? null,
            image: session?.user.image ?? null,
          }}
        />
      }
      userId={session?.user.id ?? null}
      isAdmin={isAdmin}
      isDockerEnabled={isDockerEnabled}
    />
  );
};
