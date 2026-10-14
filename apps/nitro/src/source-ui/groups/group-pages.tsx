import type { ReactNode } from "react";
import {
  Alert,
  Anchor,
  Button,
  Card,
  CardSection,
  Center,
  Divider,
  Grid,
  Group,
  NavLink,
  Stack,
  Text,
  ThemeIcon,
  Title,
  UnstyledButton,
} from "@mantine/core";
import {
  IconChevronRight,
  IconExclamationCircle,
  IconId,
  IconLock,
  IconSettings,
  IconUsersGroup,
} from "@tabler/icons-react";
import { useI18n } from "@homarr/translation/client";
import { ReservedGroupAlertView } from "../../../../../packages/ui/src/source-views/identity-settings/reserved-group-alert-view";

import type { GroupPresentation, GroupSection, GroupUserPresentation } from "./contracts";
import { everyoneGroup } from "../../../../../packages/definitions/src/group";
import classes from "./groups.module.css";

export function ReservedGroupAlert({ presentation }: { presentation: GroupPresentation }) {
  const tGroup = useI18n("group");
  const tCommon = useI18n("common");
  return (
    <ReservedGroupAlertView
      renderMessage={(documentationLink) =>
        tGroup.rich("reservedNotice.message", { checkoutDocs: () => documentationLink })
      }
      documentationLabel={tCommon("action.checkoutDocs")}
      documentationHref={presentation.documentationHref}
      linkComponent={presentation.linkComponent}
    />
  );
}

export function EveryoneGroupCard({ groupId, presentation }: { groupId: string; presentation: GroupPresentation }) {
  const tGroup = useI18n("group");
  const Link = presentation.linkComponent;
  return (
    <UnstyledButton component={Link} href={`/manage/users/groups/${groupId}`}>
      <Card className={classes.everyoneGroup}>
        <Group align="center">
          <ThemeIcon radius="xl" variant="light">
            <IconUsersGroup size={16} />
          </ThemeIcon>
          <Stack gap={0} flex={1}>
            <Text fw={500}>{tGroup("defaultGroup.name")}</Text>
            <Text size="sm" c="gray.6">
              {tGroup("defaultGroup.description", { name: everyoneGroup })}
            </Text>
          </Stack>
          <IconChevronRight size={20} />
        </Group>
      </Card>
    </UnstyledButton>
  );
}

export function GroupDetailLayout({
  groupId,
  groupName,
  section,
  presentation,
  children,
}: {
  groupId: string;
  groupName: string;
  section: GroupSection;
  presentation: GroupPresentation;
  children: ReactNode;
}) {
  const tGroupRoot = useI18n("group");
  const tGroup = useI18n("management.page.group");
  const Link = presentation.linkComponent;
  const sections: { section: GroupSection; href: string; label: string; icon: ReactNode }[] = [
    {
      section: "general",
      href: `/manage/users/groups/${groupId}`,
      label: tGroup("setting.general.title"),
      icon: <IconId size="1rem" stroke={1.5} />,
    },
    {
      section: "settings",
      href: `/manage/users/groups/${groupId}/settings`,
      label: tGroup("setting.setting.title"),
      icon: <IconSettings size="1rem" stroke={1.5} />,
    },
    {
      section: "members",
      href: `/manage/users/groups/${groupId}/members`,
      label: tGroup("setting.members.title"),
      icon: <IconUsersGroup size="1rem" stroke={1.5} />,
    },
    {
      section: "permissions",
      href: `/manage/users/groups/${groupId}/permissions`,
      label: tGroup("setting.permissions.title"),
      icon: <IconLock size="1rem" stroke={1.5} />,
    },
  ];
  return (
    <Grid>
      <Grid.Col span={12}>
        <Group justify="space-between" align="center">
          <Stack gap={0}>
            <Title order={3}>{groupName}</Title>
            <Text c="gray.5">{tGroupRoot("name")}</Text>
          </Stack>
          <Button component={Link} href="/manage/users/groups" color="gray" variant="light">
            {tGroup("back")}
          </Button>
        </Group>
      </Grid.Col>
      <Grid.Col span={{ xs: 12, md: 4, lg: 3, xl: 2 }}>
        <Stack>
          <Stack gap={0}>
            {sections.map((item) => (
              <NavLink
                key={item.section}
                component={Link}
                href={item.href}
                active={section === item.section}
                label={item.label}
                leftSection={item.icon}
              />
            ))}
          </Stack>
        </Stack>
      </Grid.Col>
      <Grid.Col span={{ xs: 12, md: 8, lg: 9, xl: 10 }}>{children}</Grid.Col>
    </Grid>
  );
}

export function GroupOwnerCard({
  owner,
  presentation,
}: {
  owner: GroupUserPresentation | null;
  presentation: GroupPresentation;
}) {
  const tGeneral = useI18n("management.page.group.setting.general");
  return (
    <>
      <Title order={2}>{tGeneral("owner")}</Title>
      <Card>
        {owner ? (
          <Group>
            {presentation.renderAvatar(owner, "lg")}
            <Stack align="start" gap={3}>
              <Text fw="bold">{owner.name}</Text>
              <Text>{owner.email}</Text>
              <Text c="dimmed" size="sm">
                {tGeneral("ownerOfGroup")}
              </Text>
            </Stack>
          </Group>
        ) : (
          <Group>
            <Stack align="start" gap={3}>
              <Text c="dimmed" size="sm">
                {tGeneral("ownerOfGroupDeleted")}
              </Text>
            </Stack>
          </Group>
        )}
      </Card>
    </>
  );
}

export function GroupDangerZone({ transfer, deletion }: { transfer: ReactNode; deletion: ReactNode }) {
  const tCommon = useI18n("common");
  const tAction = useI18n("group.action");
  return (
    <Stack gap="sm">
      <Title c="red.8" order={2}>
        {tCommon("dangerZone")}
      </Title>
      <Card style={{ borderColor: "var(--mantine-color-red-8)", borderWidth: 3 }}>
        <Stack gap="sm">
          <DangerZoneItem
            label={tAction("transfer.label")}
            description={tAction("transfer.description")}
            action={transfer}
          />
          <CardSection>
            <Divider />
          </CardSection>
          <DangerZoneItem
            label={tAction("delete.label")}
            description={tAction("delete.description")}
            action={deletion}
          />
        </Stack>
      </Card>
    </Stack>
  );
}

function DangerZoneItem({ label, description, action }: { label: string; description: string; action: ReactNode }) {
  return (
    <Group justify="space-between" px="md" w="100%">
      <Stack gap={0}>
        <Text fw="bold" size="sm">
          {label}
        </Text>
        <Text size="sm">{description}</Text>
      </Stack>
      <Group justify="end" w={{ xs: "100%", sm: "100%", md: "auto" }}>
        {action}
      </Group>
    </Group>
  );
}

export function MembershipNotice({
  reserved,
  managementType,
  presentation,
}: {
  reserved: boolean;
  managementType: "local" | "mixed" | "external";
  presentation: GroupPresentation;
}) {
  const tGroup = useI18n("group");
  if (reserved) return <ReservedGroupAlert presentation={presentation} />;
  if (managementType === "local") return null;
  return (
    <Alert variant="light" color="yellow" icon={<IconExclamationCircle size="1rem" stroke={1.5} />}>
      {tGroup(`memberNotice.${managementType}`)}
    </Alert>
  );
}

export function MemberIdentity({
  member,
  presentation,
}: {
  member: GroupUserPresentation;
  presentation: GroupPresentation;
}) {
  const Link = presentation.linkComponent;
  return (
    <Group>
      {presentation.renderAvatar(member, "sm")}
      <Anchor component={Link} href={`/manage/users/${member.id}/general`}>
        {member.name}
      </Anchor>
    </Group>
  );
}

export function EmptyMembers() {
  const tMembers = useI18n("management.page.group.setting.members");
  return (
    <Center py="sm">
      <Text fw={500} c="gray.6">
        {tMembers("notFound")}
      </Text>
    </Center>
  );
}
