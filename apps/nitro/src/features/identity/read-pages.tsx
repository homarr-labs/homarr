import { useState } from "react";
import { Alert, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { IconExclamationCircle, IconSearch } from "@tabler/icons-react";

import type { AuthenticatedReadAssemblyClient } from "@homarr/api/nitro/assembly/authenticated-read-client";
import { everyoneGroup, groupPermissionKeys } from "@homarr/definitions";
import type { GroupPermissionKey } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { UserAvatar } from "@homarr/ui";

import {
  privateApiKeysQueryOptions,
  privateGroupDetailQueryOptions,
  privateGroupListQueryOptions,
} from "../../app/private-route-loaders";
import type { GroupPresentation, GroupSection } from "../../source-ui/groups/contracts";
import { groupWriteHold } from "../../source-ui/groups/contracts";
import {
  EmptyMembers,
  EveryoneGroupCard,
  GroupDetailLayout,
  GroupOwnerCard,
  MemberIdentity,
  MembershipNotice,
  ReservedGroupAlert,
} from "../../source-ui/groups/group-pages";
import { GroupsTable } from "../../source-ui/groups/groups-table";
import { EffectivePermissionPreview } from "../../source-ui/groups/permissions";
import type { PermissionLabels } from "../../source-ui/groups/permissions";
import { ApiKeysView } from "../../source-ui/users/api-keys";
import type { UserAvatarRenderer } from "../../source-ui/users/contracts";
import { IdentityDenied, IdentityError, IdentityLoading } from "./feedback";
import { useIdentityRead } from "./read-boundary";

type ReadGroupDetail = Awaited<ReturnType<AuthenticatedReadAssemblyClient["group"]["getById"]>>;

const renderApiKeyAvatar: UserAvatarRenderer = (user, size) => <UserAvatar user={user} size={size} />;

export function ReadGroupListPage({ presentation }: { presentation: GroupPresentation }) {
  const { principal, authorityKey, scope } = useIdentityRead();
  scope.assertCurrent();
  if (!principal.user.permissions.includes("admin")) return <IdentityDenied />;
  return <ReadGroupList key={authorityKey} presentation={presentation} />;
}

function ReadGroupList({ presentation }: { presentation: GroupPresentation }) {
  const { scope } = useIdentityRead();
  const [search, setSearch] = useState("");
  const tCommon = useI18n("common");
  const tGroup = useI18n("group");
  const query = useQuery(privateGroupListQueryOptions(scope), scope.queryClient);
  if (query.isError) return <IdentityError error={query.error} retry={() => void query.refetch()} />;
  if (query.isPending) return <IdentityLoading />;
  if (query.data === undefined) return <IdentityError error="The group list response is unavailable." />;
  scope.assertCurrent();
  const reserved = query.data.find((group) => group.name === everyoneGroup);
  const groups = query.data
    .filter((group) => group.name !== everyoneGroup)
    .toSorted((left, right) => left.position - right.position)
    .filter((group) => group.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <Stack>
      <Title order={2}>{tCommon("entity.groups")}</Title>
      {reserved && <EveryoneGroupCard groupId={reserved.id} presentation={presentation} />}
      <TextInput
        leftSection={<IconSearch size={20} stroke={1.5} />}
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        placeholder={`${tGroup("search")}...`}
        aria-label={tGroup("search")}
      />
      <ReadGroupWriteHold />
      <Alert title="Group ordering unavailable">
        The sortable-write controls remain held. Position writes require accepted Group2 ordering authority, compatible
        SQL writers and request lifetime bindings.
      </Alert>
      <GroupsTable groups={groups} presentation={presentation} />
    </Stack>
  );
}

export function ReadGroupDetailPage({
  groupId,
  section,
  presentation,
}: {
  groupId: string;
  section: GroupSection;
  presentation: GroupPresentation;
}) {
  const { principal, authorityKey, scope } = useIdentityRead();
  scope.assertCurrent();
  if (!principal.user.permissions.includes("admin")) return <IdentityDenied />;
  return <ReadGroupDetail key={authorityKey} groupId={groupId} section={section} presentation={presentation} />;
}

function ReadGroupDetail({
  groupId,
  section,
  presentation,
}: {
  groupId: string;
  section: GroupSection;
  presentation: GroupPresentation;
}) {
  const { scope } = useIdentityRead();
  const query = useQuery(privateGroupDetailQueryOptions(scope, groupId), scope.queryClient);
  if (query.isError) return <IdentityError error={query.error} retry={() => void query.refetch()} />;
  if (query.isPending) return <IdentityLoading />;
  if (query.data === undefined || query.data === null) {
    return <IdentityError error="The group detail response is unavailable." />;
  }
  scope.assertCurrent();
  const group = query.data;
  return (
    <GroupDetailLayout groupId={group.id} groupName={group.name} section={section} presentation={presentation}>
      <Stack key={`${group.id}:${section}`}>
        <ReadGroupWriteHold />
        {section === "general" && <ReadGroupGeneral group={group} presentation={presentation} />}
        {section === "members" && <ReadGroupMembers group={group} presentation={presentation} />}
        {section === "settings" && <ReadGroupSettings group={group} />}
        {section === "permissions" && <ReadGroupPermissions group={group} />}
      </Stack>
    </GroupDetailLayout>
  );
}

function ReadGroupWriteHold() {
  const { writeHoldReason, demo } = useIdentityRead();
  return (
    <Alert title="Group writes unavailable">
      <Stack gap="xs">
        <Text size="sm">{groupWriteHold}</Text>
        {writeHoldReason !== groupWriteHold && <Text size="sm">{writeHoldReason}</Text>}
        {demo.enabled && demo.readOnly && <Text size="sm">Mutations are also disabled in read-only demo mode.</Text>}
      </Stack>
    </Alert>
  );
}

function ReadGroupGeneral({ group, presentation }: { group: ReadGroupDetail; presentation: GroupPresentation }) {
  const tGeneral = useI18n("management.page.group.setting.general");
  const tCommon = useI18n("common");
  return (
    <Stack>
      <Title>{tGeneral("title")}</Title>
      {group.name === everyoneGroup && <ReservedGroupAlert presentation={presentation} />}
      <TextInput label={tCommon("field.name")} value={group.name} readOnly />
      <GroupOwnerCard owner={group.owner} presentation={presentation} />
      <Alert title="Owner selection unavailable">
        Rename, ownership transfer and deletion remain held. The user selector is not part of native11.
      </Alert>
    </Stack>
  );
}

function ReadGroupMembers({ group, presentation }: { group: ReadGroupDetail; presentation: GroupPresentation }) {
  const { locallyManagedProviders, enabledProviders } = useIdentityRead();
  const [search, setSearch] = useState("");
  const tMembers = useI18n("management.page.group.setting.members");
  const allowedProviders = locallyManagedProviders.filter(
    (provider) => enabledProviders.includes(provider) && (provider === "credentials" || provider === "oidc"),
  );
  let managementType: "local" | "mixed" | "external" = "mixed";
  if (allowedProviders.length === enabledProviders.length) managementType = "local";
  else if (allowedProviders.length === 0) managementType = "external";
  const filtered = group.members.filter(
    (member) => !search.trim() || member.name?.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <Stack>
      <Title>{tMembers("title")}</Title>
      <MembershipNotice
        reserved={group.name === everyoneGroup}
        managementType={managementType}
        presentation={presentation}
      />
      <TextInput
        leftSection={<IconSearch size={20} stroke={1.5} />}
        placeholder={`${tMembers("search")}...`}
        aria-label={tMembers("search")}
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
      />
      <Alert title="Membership changes unavailable">
        Member additions, removals and candidate selection remain held. The user selector is not part of native11.
      </Alert>
      {filtered.length === 0 && <EmptyMembers />}
      <Table striped highlightOnHover>
        <Table.Tbody>
          {filtered.map((member) => (
            <Table.Tr key={member.id}>
              <Table.Td>
                <MemberIdentity member={member} presentation={presentation} />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}

function ReadGroupSettings({ group }: { group: ReadGroupDetail }) {
  const tSettings = useI18n("management.page.group.setting.setting");
  const tEntities = useI18n("common.entity");
  const tGroup = useI18n("group");
  return (
    <Stack>
      <Title>{tSettings("title")}</Title>
      <Alert color="cyan" icon={<IconExclamationCircle size="1rem" stroke={1.5} />}>
        {tSettings("alert")}
      </Alert>
      <Title order={3}>{tEntities("boards")}</Title>
      <Alert title="Board selection unavailable">
        These are the stored board IDs, not board titles or selectable choices. Board selectors and settings saves
        remain held; native11 does not include the group board selector.
      </Alert>
      <TextInput
        label={tGroup("field.homeBoard.label")}
        description={tGroup("field.homeBoard.description")}
        value={group.homeBoardId ?? ""}
        placeholder="No stored board ID"
        readOnly
      />
      <TextInput
        label={tGroup("field.mobileBoard.label")}
        description={tGroup("field.mobileBoard.description")}
        value={group.mobileHomeBoardId ?? ""}
        placeholder="No stored board ID"
        readOnly
      />
    </Stack>
  );
}

function ReadGroupPermissions({ group }: { group: ReadGroupDetail }) {
  const tPage = useI18n("management.page.group.setting.permissions");
  const tPermissions = useI18n("group.permission");
  const textKeys = {
    "board-create": "board.item.create",
    "board-view-all": "board.item.view-all",
    "board-modify-all": "board.item.modify-all",
    "board-full-all": "board.item.full-all",
    "app-create": "app.item.create",
    "app-use-all": "app.item.use-all",
    "app-modify-all": "app.item.modify-all",
    "app-full-all": "app.item.full-all",
    "integration-create": "integration.item.create",
    "integration-use-all": "integration.item.use-all",
    "integration-interact-all": "integration.item.interact-all",
    "integration-full-all": "integration.item.full-all",
    "search-engine-create": "search-engine.item.create",
    "search-engine-modify-all": "search-engine.item.modify-all",
    "search-engine-full-all": "search-engine.item.full-all",
    "media-upload": "media.item.upload",
    "media-view-all": "media.item.view-all",
    "media-full-all": "media.item.full-all",
    "other-view-logs": "other.item.view-logs",
    admin: "admin.item.admin",
  } satisfies Record<GroupPermissionKey, `${string}.item.${string}`>;
  const permissionLabels: PermissionLabels = {};
  for (const key of groupPermissionKeys) {
    permissionLabels[key] = tPermissions(`${textKeys[key]}.label`);
  }
  return (
    <Stack>
      <Title>{tPage("title")}</Title>
      <Alert title="Permission writes unavailable">
        The native save is guarded pending authenticated admin, compatible-writer, current-authority-to-COMMIT and
        lifetime bindings. Stored permissions are shown without a writable editor.
      </Alert>
      <Stack gap="xs">
        {group.permissions.map((permission) => (
          <Text key={permission} size="sm">
            {permissionLabels[permission] ?? permission}
          </Text>
        ))}
      </Stack>
      <EffectivePermissionPreview selected={group.permissions} permissionLabels={permissionLabels} />
    </Stack>
  );
}

export function ReadApiKeyAdministration() {
  const { principal, authorityKey, scope } = useIdentityRead();
  scope.assertCurrent();
  if (!principal.user.permissions.includes("admin")) return <IdentityDenied />;
  return <ReadApiKeys key={authorityKey} />;
}

function ReadApiKeys() {
  const { scope, writeHoldReason, demo } = useIdentityRead();
  const query = useQuery(privateApiKeysQueryOptions(scope), scope.queryClient);
  if (query.isError) return <IdentityError error={query.error} retry={() => void query.refetch()} />;
  if (query.isPending) return <IdentityLoading />;
  if (query.data === undefined) return <IdentityError error="The API-key metadata response is unavailable." />;
  scope.assertCurrent();
  return (
    <ApiKeysView
      apiKeys={query.data}
      creating={false}
      createDisabled={true}
      createdKey={null}
      renderAvatar={renderApiKeyAvatar}
      refreshing={query.isFetching}
      feedback={
        <Alert title="API-key writes unavailable">
          <Stack gap="xs">
            <Text size="sm">{writeHoldReason}</Text>
            <Text size="sm">Native11 exposes metadata only. API-key creation and revocation remain held.</Text>
            {demo.enabled && demo.readOnly && (
              <Text size="sm">Mutations are also disabled in read-only demo mode.</Text>
            )}
          </Stack>
        </Alert>
      }
    />
  );
}
