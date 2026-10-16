"use client";

import type { ReactElement, ReactNode } from "react";
import {
  Alert,
  Anchor,
  Button,
  Card,
  Center,
  Grid,
  GridCol,
  Group,
  Loader,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTr,
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
  IconShieldLock,
  IconUsersGroup,
} from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import type { Session } from "@homarr/auth";
import { useSession } from "@homarr/auth/client";
import { objectKeys } from "@homarr/common";
import type { GroupPermissionKey } from "@homarr/definitions";
import { everyoneGroup, groupPermissions } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { Link, SearchInput, UserAvatar } from "@homarr/ui";

import { UserListComponent } from "~/app/[locale]/manage/users/_components/user-list";
import { canAccessUserEditPage } from "~/app/[locale]/manage/users/[userId]/access";
import { DeleteUserButton } from "~/app/[locale]/manage/users/[userId]/general/_components/_delete-user-button";
import { UserGeneralSettingsForm } from "~/app/[locale]/manage/users/[userId]/general/_components/_general-settings-form";
import { OAuthConnections } from "~/app/[locale]/manage/users/[userId]/general/_components/_oauth-connections";
import { UserProfileAvatarForm } from "~/app/[locale]/manage/users/[userId]/general/_components/_profile-avatar-form";
import { ResetTours } from "~/app/[locale]/manage/users/[userId]/general/_components/_reset-tours";
import { ChangePasswordForm } from "~/app/[locale]/manage/users/[userId]/security/_components/_change-password-form";
import { UserCreateStepperComponent } from "~/app/[locale]/manage/users/create/_components/create-user-stepper";
import { GroupsList } from "~/app/[locale]/manage/users/groups/_client";
import { DeleteGroup } from "~/app/[locale]/manage/users/groups/[id]/_delete-group";
import { NavigationLink } from "~/app/[locale]/manage/users/groups/[id]/_navigation";
import { RenameGroupForm } from "~/app/[locale]/manage/users/groups/[id]/_rename-group-form";
import { ReservedGroupAlert } from "~/app/[locale]/manage/users/groups/[id]/_reserved-group-alert";
import { TransferGroupOwnership } from "~/app/[locale]/manage/users/groups/[id]/_transfer-group-ownership";
import { AddGroupMember } from "~/app/[locale]/manage/users/groups/[id]/members/_add-group-member";
import { RemoveGroupMember } from "~/app/[locale]/manage/users/groups/[id]/members/_remove-group-member";
import type { PermissionLabels } from "~/app/[locale]/manage/users/groups/[id]/permissions/_group-permission-form";
import {
  EffectivePermissionPreview,
  PermissionForm,
  PermissionMatrix,
  PresetButtons,
  SaveAffix,
} from "~/app/[locale]/manage/users/groups/[id]/permissions/_group-permission-form";
import { GroupHomeBoards } from "~/app/[locale]/manage/users/groups/[id]/settings/_group-home-boards";
import classes from "~/app/[locale]/manage/users/groups/groups.module.css";
import { TourTarget } from "~/components/layout/header/tour-target";
import { DangerZoneItem, DangerZoneRoot } from "~/components/manage/danger-zone";
import { ManageContainer } from "~/components/manage/manage-container";
import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { MobileAffixButton } from "~/components/manage/mobile-affix-button";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { useWorkerBootstrap, useWorkerConnections, useWorkerWorkspace } from "~/worker/context";
import { WorkerSharing } from "~/worker/sharing";

export interface WorkerUsersRouteProps {
  /** Route segments after /manage, including users. */
  segments: string[];
  searchParams: URLSearchParams;
}

type GroupData = RouterOutputs["group"]["getById"];
type UserData = RouterOutputs["user"]["getById"];

interface QueryStatusProps {
  isError?: boolean;
  error?: { message: string } | null;
  refetch?: () => unknown;
}

const QueryStatus = ({ isError, error, refetch }: QueryStatusProps) => {
  const t = useI18n("common");
  if (isError) {
    return (
      <Alert color="red" title={t("error")} role="alert" icon={<IconExclamationCircle size={18} />}>
        <Stack gap="sm">
          {error && <Text size="sm">{error.message}</Text>}
          {refetch && (
            <Button variant="light" w="fit-content" onClick={() => void refetch()}>
              {t("action.tryAgain")}
            </Button>
          )}
        </Stack>
      </Alert>
    );
  }
  return (
    <Center component="output" py="xl" aria-label={t("action.loading")}>
      <Loader />
    </Center>
  );
};

const Unavailable = () => {
  const t = useI18n("common");
  return <Text c="dimmed">{t("noResults")}</Text>;
};

export const WorkerUsersRoute = ({ segments, searchParams }: WorkerUsersRouteProps): ReactElement => {
  const session = useSession();
  if (session.status === "loading") return <QueryStatus />;
  if (!session.data || segments[0] !== "users") return <Unavailable />;

  const path = segments.slice(1);
  const section = path[0];
  if (section && !["create", "invites", "groups"].includes(section)) {
    if (path.length > 2 || (path[1] && !["general", "security"].includes(path[1]))) return <Unavailable />;
    if (!canAccessUserEditPage(session.data, section)) return <Unavailable />;
    return <UserDetail userId={section} section={path[1] ?? "general"} session={session.data} />;
  }

  if (!session.data.user.permissions.includes("admin")) return <Unavailable />;
  if (!section) return <UsersOverview />;
  if (section === "create" && path.length === 1) return <CreateUser />;
  if (section === "invites" && path.length === 1) return <InvitationsOverview />;
  if (section === "groups") {
    if (path.length === 1) return <GroupsOverview />;
    if (path[1] && path.length <= 3) {
      return <GroupDetail id={path[1]} section={path[2] ?? "general"} searchParams={searchParams} />;
    }
  }
  return <Unavailable />;
};

const UsersOverview = () => {
  const t = useI18n("management.page.user");
  const tCommon = useI18n("common.entity");
  const users = clientApi.user.getAll.useQuery();
  const runtime = clientApi.frontend.runtime.useQuery();
  if (users.isError || !users.data) return <QueryStatus {...users} />;
  if (runtime.isError || !runtime.data) return <QueryStatus {...runtime} />;

  let primaryAction: ReactNode;
  if (runtime.data.credentialsEnabled) {
    primaryAction = (
      <TourTarget id="manage-users-create">
        <MobileAffixButton component={Link} href="/manage/users/create">
          {t("create.title")}
        </MobileAffixButton>
      </TourTarget>
    );
  }

  return (
    <ManagePageLayout
      title={tCommon("users")}
      primaryAction={primaryAction}
      floatingPrimaryAction={runtime.data.credentialsEnabled}
    >
      <TourTarget id="manage-users-list">
        <UserListComponent initialUserList={users.data} />
      </TourTarget>
    </ManagePageLayout>
  );
};

const CreateUser = () => {
  const runtime = clientApi.frontend.runtime.useQuery();
  const groups = clientApi.frontend.defaultGroups.useQuery(undefined, {
    enabled: runtime.data?.credentialsEnabled ?? false,
  });
  if (runtime.isError || !runtime.data) return <QueryStatus {...runtime} />;
  if (!runtime.data.credentialsEnabled) return <Unavailable />;
  if (groups.isError || !groups.data) return <QueryStatus {...groups} />;
  return (
    <ManageContainer>
      <DynamicBreadcrumb />
      <UserCreateStepperComponent
        initialGroups={groups.data.map((group) => ({
          ...group,
          permissions: group.permissions.map(({ permission }) => permission),
        }))}
      />
    </ManageContainer>
  );
};

const InvitationsOverview = () => {
  const t = useI18n("management.page.user.invite");
  const { runtime } = useWorkerBootstrap();
  const { pool } = useWorkerWorkspace();
  const snapshot = useWorkerConnections();
  const selected = snapshot.workers.find(({ worker }) => worker.workerId === snapshot.primaryWorkerId);
  if (!selected?.connected || selected.worker.grant.role !== "owner") {
    return (
      <ManagePageLayout title={t("title")}>
        <Alert>A worker owner must connect before creating or revoking device invitations.</Alert>
      </ManagePageLayout>
    );
  }
  const connection = pool.getConnection(selected.worker.workerId);
  return (
    <ManagePageLayout title={t("title")}>
      <Text size="sm" c="dimmed">
        To keep someone's existing groups and permissions, create their Homarr user first, then choose that user when
        creating a device invitation.
      </Text>
      {runtime.credentialsEnabled && (
        <Button component={Link} href="/manage/users/create" variant="light" w="fit-content">
          Create Homarr user
        </Button>
      )}
      <WorkerSharing worker={selected.worker} connection={connection} />
    </ManagePageLayout>
  );
};

const GroupsOverview = () => {
  const tCommon = useI18n("common");
  const tGroup = useI18n("group");
  const groups = clientApi.group.getAll.useQuery();
  if (groups.isError || !groups.data) return <QueryStatus {...groups} />;
  const defaultGroup = groups.data.find((group) => group.name === everyoneGroup);
  return (
    <ManagePageLayout title={tCommon("entity.groups")}>
      <Stack>
        {defaultGroup && (
          <UnstyledButton component={Link} href={`/manage/users/groups/${defaultGroup.id}`}>
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
        )}
        <GroupsList groups={groups.data.filter((group) => group.name !== everyoneGroup)} />
      </Stack>
    </ManagePageLayout>
  );
};

const GroupDetail = ({ id, section, searchParams }: { id: string; section: string; searchParams: URLSearchParams }) => {
  const t = useI18n("management.page.group");
  const tGroup = useI18n("group");
  const result = clientApi.group.getById.useQuery({ id });
  if (result.isError || !result.data) return <QueryStatus {...result} />;
  const group = result.data;
  let content: ReactNode;
  if (section === "general") content = <GroupGeneral group={group} />;
  else if (section === "members") content = <GroupMembers group={group} searchParams={searchParams} />;
  else if (section === "permissions") content = <GroupPermissions group={group} />;
  else if (section === "settings") content = <GroupSettings group={group} />;
  else return <Unavailable />;
  return (
    <ManageContainer size="xl">
      <DynamicBreadcrumb dynamicMappings={new Map([[id, group.name]])} />
      <Grid>
        <GridCol span={12}>
          <Group justify="space-between" align="center">
            <Stack gap={0}>
              <Title order={3}>{group.name}</Title>
              <Text c="gray.5">{tGroup("name")}</Text>
            </Stack>
            <Button component={Link} href="/manage/users/groups" color="gray" variant="light">
              {t("back")}
            </Button>
          </Group>
        </GridCol>
        <GridCol span={{ xs: 12, md: 4, lg: 3, xl: 2 }}>
          <Stack gap={0}>
            <NavigationLink
              href={`/manage/users/groups/${id}`}
              label={t("setting.general.title")}
              icon={<IconId size="1rem" stroke={1.5} />}
            />
            <NavigationLink
              href={`/manage/users/groups/${id}/settings`}
              label={t("setting.setting.title")}
              icon={<IconSettings size="1rem" stroke={1.5} />}
            />
            <NavigationLink
              href={`/manage/users/groups/${id}/members`}
              label={t("setting.members.title")}
              icon={<IconUsersGroup size="1rem" stroke={1.5} />}
            />
            <NavigationLink
              href={`/manage/users/groups/${id}/permissions`}
              label={t("setting.permissions.title")}
              icon={<IconLock size="1rem" stroke={1.5} />}
            />
          </Stack>
        </GridCol>
        <GridCol span={{ xs: 12, md: 8, lg: 9, xl: 10 }}>{content}</GridCol>
      </Grid>
    </ManageContainer>
  );
};

const GroupGeneral = ({ group }: { group: GroupData }) => {
  const t = useI18n("management.page.group.setting.general");
  const tAction = useI18n("group.action");
  const isReserved = group.name === everyoneGroup;
  let ownerContent: ReactNode = (
    <Text c="dimmed" size="sm">
      {t("ownerOfGroupDeleted")}
    </Text>
  );
  if (group.owner) {
    ownerContent = (
      <Group>
        <UserAvatar user={group.owner} size="lg" />
        <Stack align="start" gap={3}>
          <Text fw="bold">{group.owner.name}</Text>
          <Text>{group.owner.email}</Text>
          <Text c="dimmed" size="sm">
            {t("ownerOfGroup")}
          </Text>
        </Stack>
      </Group>
    );
  }
  return (
    <Stack>
      <Title>{t("title")}</Title>
      {isReserved && <ReservedGroupAlert />}
      <RenameGroupForm key={group.id} group={group} disabled={isReserved} />
      <Title order={2}>{t("owner")}</Title>
      <Card>{ownerContent}</Card>
      {!isReserved && (
        <DangerZoneRoot>
          <DangerZoneItem
            label={tAction("transfer.label")}
            description={tAction("transfer.description")}
            action={<TransferGroupOwnership group={group} />}
          />
          <DangerZoneItem
            label={tAction("delete.label")}
            description={tAction("delete.description")}
            action={<DeleteGroup group={group} />}
          />
        </DangerZoneRoot>
      )}
    </Stack>
  );
};

const GroupMembers = ({ group, searchParams }: { group: GroupData; searchParams: URLSearchParams }) => {
  const t = useI18n("management.page.group.setting.members");
  const tGroup = useI18n("group");
  const runtime = clientApi.frontend.runtime.useQuery();
  if (runtime.isError || !runtime.data) return <QueryStatus {...runtime} />;
  const isReserved = group.name === everyoneGroup;
  const search = searchParams.get("search") ?? "";
  const term = search.trim().toLowerCase();
  const members = group.members.filter((member) => !term || member.name?.toLowerCase().includes(term));
  const managementType = runtime.data.groupMemberManagementType;
  const allowedProviders = runtime.data.locallyManageableProviders;
  return (
    <Stack>
      <Title>{t("title")}</Title>
      {isReserved && <ReservedGroupAlert />}
      {!isReserved && managementType !== "local" && (
        <Alert variant="light" color="yellow" icon={<IconExclamationCircle size="1rem" stroke={1.5} />}>
          {tGroup(`memberNotice.${managementType}`)}
        </Alert>
      )}
      <Group justify="space-between">
        <SearchInput placeholder={`${t("search")}...`} ariaLabel={t("search")} defaultValue={search} />
        {managementType !== "external" && !isReserved && (
          <AddGroupMember
            groupId={group.id}
            presentUserIds={group.members.map((member) => member.id)}
            allowedProviders={allowedProviders}
          />
        )}
      </Group>
      {members.length === 0 && (
        <Center py="sm">
          <Text fw={500} c="gray.6">
            {t("notFound")}
          </Text>
        </Center>
      )}
      <Table striped highlightOnHover>
        <TableTbody>
          {members.map((member) => (
            <TableTr key={member.id}>
              <TableTd>
                <Group>
                  <UserAvatar size="sm" user={member} />
                  <Anchor component={Link} href={`/manage/users/${member.id}/general`}>
                    {member.name}
                  </Anchor>
                </Group>
              </TableTd>
              <TableTd w={100}>
                {!isReserved && allowedProviders.includes(member.provider) && (
                  <RemoveGroupMember user={member} groupId={group.id} />
                )}
              </TableTd>
            </TableTr>
          ))}
        </TableTbody>
      </Table>
    </Stack>
  );
};

const GroupPermissions = ({ group }: { group: GroupData }) => {
  const t = useI18n("management.page.group.setting.permissions");
  const tPermission = useI18n("group.permission");
  const permissionLabels: PermissionLabels = {};
  const permissionDescriptions: PermissionLabels = {};
  for (const category of objectKeys(groupPermissions)) {
    const item = groupPermissions[category];
    let suffixes: readonly string[] = ["admin"];
    if (typeof item !== "boolean") suffixes = item;
    for (const suffix of suffixes) {
      let key: GroupPermissionKey = "admin";
      if (typeof item !== "boolean") key = `${category}-${suffix}` as GroupPermissionKey;
      type PermissionTextKey = Parameters<typeof tPermission>[0];
      permissionLabels[key] = tPermission(`${category}.item.${suffix}.label` as PermissionTextKey);
      permissionDescriptions[key] = tPermission(`${category}.item.${suffix}.description` as PermissionTextKey);
    }
  }
  return (
    <Stack>
      <Title>{t("title")}</Title>
      <PermissionForm key={group.id} initialPermissions={group.permissions}>
        <Stack pos="relative">
          <PresetButtons />
          <PermissionMatrix permissionLabels={permissionLabels} permissionDescriptions={permissionDescriptions} />
          <EffectivePermissionPreview permissionLabels={permissionLabels} />
          <SaveAffix groupId={group.id} />
        </Stack>
      </PermissionForm>
    </Stack>
  );
};

const GroupSettings = ({ group }: { group: GroupData }) => {
  const t = useI18n("management.page.group.setting.setting");
  const tEntity = useI18n("common.entity");
  return (
    <Stack>
      <Title>{t("title")}</Title>
      <Alert color="cyan" icon={<IconExclamationCircle size="1rem" stroke={1.5} />}>
        {t("alert")}
      </Alert>
      <Title order={3}>{tEntity("boards")}</Title>
      <GroupHomeBoards
        key={group.id}
        homeBoardId={group.homeBoardId}
        mobileHomeBoardId={group.mobileHomeBoardId}
        groupId={group.id}
      />
    </Stack>
  );
};

const UserDetail = ({ userId, section, session }: { userId: string; section: string; session: Session }) => {
  const tNavigation = useI18n("navigationStructure.manage.users");
  const tUserRoot = useI18n("user");
  const t = useI18n("management.page.user");
  const result = clientApi.user.getById.useQuery({ userId });
  if (result.isError || !result.data) return <QueryStatus {...result} />;
  const user = result.data;
  if (!canAccessUserEditPage(session, user.id)) return <Unavailable />;
  if (section === "security" && user.provider !== "credentials") return <Unavailable />;
  let content = <UserGeneral user={user} session={session} />;
  if (section === "security") content = <UserSecurity user={user} />;
  return (
    <ManageContainer size="xl">
      <DynamicBreadcrumb
        dynamicMappings={
          new Map([
            [userId, user.name ?? ""],
            ["general", tNavigation("general")],
            ["security", tNavigation("security")],
          ])
        }
      />
      <Grid>
        <GridCol span={12}>
          <Group align="center">
            <UserAvatar user={user} size="lg" />
            <Stack gap={0}>
              <Title order={3}>{user.name}</Title>
              <Text c="gray.5">{tUserRoot("name")}</Text>
            </Stack>
          </Group>
        </GridCol>
        <GridCol span={{ xs: 12, md: 4, lg: 3, xl: 2 }}>
          <Stack gap={0}>
            <NavigationLink
              href={`/manage/users/${userId}/general`}
              label={t("setting.general.title")}
              icon={<IconSettings size="1rem" stroke={1.5} />}
            />
            {user.provider === "credentials" && (
              <NavigationLink
                href={`/manage/users/${userId}/security`}
                label={t("setting.security.title")}
                icon={<IconShieldLock size="1rem" stroke={1.5} />}
              />
            )}
          </Stack>
        </GridCol>
        <GridCol span={{ xs: 12, md: 8, lg: 9, xl: 10 }}>{content}</GridCol>
      </Grid>
    </ManageContainer>
  );
};

const UserGeneral = ({ user, session }: { user: UserData; session: Session }) => {
  const tManagement = useI18n("management.page.user");
  const t = useI18n("management.page.user.setting.general");
  const tUser = useI18n("user");
  const boards = clientApi.board.getManageOverview.useQuery({ fullPreview: false, userId: user.id });
  const searchEngines = clientApi.searchEngine.getSelectable.useQuery();
  if (boards.isError || !boards.data) return <QueryStatus {...boards} />;
  if (searchEngines.isError || !searchEngines.data) return <QueryStatus {...searchEngines} />;
  const isSelf = session.user.id === user.id;
  return (
    <Stack>
      {user.provider !== "credentials" && (
        <Alert variant="light" color="yellow" icon={<IconExclamationCircle size="1rem" stroke={1.5} />}>
          {tManagement("fieldsDisabledExternalProvider")}
        </Alert>
      )}
      <Title>{t("title")}</Title>
      <UserGeneralSettingsForm
        key={user.id}
        user={user}
        boardsData={boards.data.map(({ id, name, logoImageUrl, preview }) => ({ id, name, logoImageUrl, preview }))}
        searchEnginesData={searchEngines.data}
        showLanguageSelector={isSelf}
        profileAvatar={<UserProfileAvatarForm user={user} />}
      />
      {isSelf && <OAuthConnections key={user.id} />}
      {isSelf && (
        <Stack mb="lg">
          <Title order={2}>{t("item.onboardingTours.title")}</Title>
          <ResetTours />
        </Stack>
      )}
      <DangerZoneRoot>
        <DangerZoneItem
          label={tUser("action.delete.label")}
          description={tUser("action.delete.description")}
          action={<DeleteUserButton user={user} />}
        />
      </DangerZoneRoot>
    </Stack>
  );
};

const UserSecurity = ({ user }: { user: UserData }) => {
  const t = useI18n("management.page.user.setting.security");
  return (
    <Stack>
      <Title>{t("title")}</Title>
      <ChangePasswordForm key={user.id} user={user} />
    </Stack>
  );
};
