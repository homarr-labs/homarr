import type { MantineColor } from "@mantine/core";
import { Button, Stack, Text } from "@mantine/core";
import { IconBook2, IconLayoutDashboard, IconMailForward } from "@tabler/icons-react";

import { isProviderEnabled } from "@homarr/auth/server";
import { getMantineColor } from "@homarr/common";
import { createDocumentationLink } from "@homarr/definitions";
import { getScopedI18n } from "@homarr/translation/server";
import { Link } from "@homarr/ui";
import type { TablerIcon } from "@homarr/ui";

import { InitStepCard } from "../../_components/init-step-card";

export const InitFinish = async () => {
  const tFinish = await getScopedI18n("init.step.finish");

  return (
    <InitStepCard>
      <Stack>
        <Text>{tFinish("description")}</Text>

        <InternalLinkButton href="/auth/login?callbackUrl=/" iconProps={{ icon: IconLayoutDashboard, color: "blue" }}>
          {tFinish("action.goToBoard", { name: "dashboard" })}
        </InternalLinkButton>

        {isProviderEnabled("credentials") && (
          <InternalLinkButton
            href="/auth/login?callbackUrl=/manage/users/invites"
            iconProps={{ icon: IconMailForward, color: "pink" }}
          >
            {tFinish("action.inviteUser")}
          </InternalLinkButton>
        )}

        <ExternalLinkButton
          href={createDocumentationLink("/docs/getting-started/after-the-installation")}
          iconProps={{ icon: IconBook2, color: "yellow" }}
        >
          {tFinish("action.docs")}
        </ExternalLinkButton>
      </Stack>
    </InitStepCard>
  );
};

interface LinkButtonProps {
  href: string;
  children: string;
  iconProps: IconProps;
}

interface IconProps {
  icon: TablerIcon;
  color: MantineColor;
}

const Icon = ({ icon: IcomComponent, color }: IconProps) => {
  return <IcomComponent color={getMantineColor(color, 6)} size={16} stroke={1.5} />;
};

const InternalLinkButton = ({ href, children, iconProps }: LinkButtonProps) => {
  return (
    <Button variant="default" component={Link} href={href} leftSection={<Icon {...iconProps} />}>
      {children}
    </Button>
  );
};

const ExternalLinkButton = ({ href, children, iconProps }: LinkButtonProps) => {
  return (
    <Button variant="default" component="a" href={href} leftSection={<Icon {...iconProps} />}>
      {children}
    </Button>
  );
};
