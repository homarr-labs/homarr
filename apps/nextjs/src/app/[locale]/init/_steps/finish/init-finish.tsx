import Link from "next/link";
import type { MantineColor } from "@mantine/core";
import { Button, Card, Stack, Text } from "@mantine/core";
import { IconBook2, IconCategoryPlus, IconLayoutDashboard, IconMailForward } from "@tabler/icons-react";

import { isProviderEnabled } from "@homarr/auth/server";
import { getMantineColor } from "@homarr/common";
import { db } from "@homarr/db";
import { createDocumentationLink } from "@homarr/definitions";
import type { TablerIcon } from "@homarr/ui";

export const InitFinish = async () => {
  const firstBoard = await db.query.boards.findFirst({ columns: { name: true } });

  return (
    <Card w={64 * 6} maw="90vw" withBorder>
      <Stack>
        <Text>
          You have successfully completed the setup process. You can now start using Homarr. Select your next action:
        </Text>

        {firstBoard ? (
          <InternalLinkButton
            href={`/boards/${firstBoard.name}`}
            iconProps={{ icon: IconLayoutDashboard, color: "blue" }}
          >
            Go to your board
          </InternalLinkButton>
        ) : (
          <InternalLinkButton href="/manage/boards" iconProps={{ icon: IconCategoryPlus, color: "blue" }}>
            Create your first board
          </InternalLinkButton>
        )}

        {isProviderEnabled("credentials") && (
          <InternalLinkButton href="/manage/users/invites" iconProps={{ icon: IconMailForward, color: "indigo" }}>
            Invite other users
          </InternalLinkButton>
        )}

        <ExternalLinkButton
          href={createDocumentationLink("/docs/getting-started/after-the-installation")}
          iconProps={{ icon: IconBook2, color: "yellow" }}
        >
          Read the documentation
        </ExternalLinkButton>
      </Stack>
    </Card>
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
