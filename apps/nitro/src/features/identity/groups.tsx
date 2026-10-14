import { useEffect, useState } from "react";
import { Alert, Button, Group, Stack, Table, Text, TextInput, Title, useMatches } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { IconExclamationCircle, IconSearch } from "@tabler/icons-react";
import { useI18n } from "@homarr/translation/client";

import { everyoneGroup } from "../../../../../packages/definitions/src/group";
import { InlineConfirmButton } from "../../../../../packages/ui/src/components/inline-confirm-action";
import type { GroupDetail, GroupList } from "./client";
import { useIdentity, useIdentityKey } from "./boundary";
import { ActionFeedback, IdentityDenied, IdentityError, IdentityLoading, useIdentityAction } from "./feedback";
import { GroupPermissionEditor } from "./permissions";
import { useIdentityDraft } from "./draft";
import { groupCreateSchema, groupSavePartialSettingsSchema, groupUpdateSchema, validationMessage } from "./validation";
import type { GroupPresentation, GroupSection } from "../../source-ui/groups/contracts";
import { groupWriteHold } from "../../source-ui/groups/contracts";
import {
  GroupCreateForm,
  GroupHomeBoards,
  RenameGroupForm,
  UserAccessPicker,
} from "../../source-ui/groups/group-forms";
import {
  EmptyMembers,
  EveryoneGroupCard,
  GroupDangerZone,
  GroupDetailLayout,
  GroupOwnerCard,
  MemberIdentity,
  MembershipNotice,
  ReservedGroupAlert,
} from "../../source-ui/groups/group-pages";
import { GroupsListView } from "../../source-ui/groups/groups-table";

export interface GroupListPageProps {
  presentation: GroupPresentation;
  createRequested?: boolean;
  onCloseCreate?: () => void;
  writeHoldReason?: string | null;
}

export function GroupListPage({
  presentation,
  createRequested = false,
  onCloseCreate,
  writeHoldReason = groupWriteHold,
}: GroupListPageProps) {
  const { client, principal } = useIdentity();
  const key = useIdentityKey();
  const tCommon = useI18n("common");
  const admin = principal.user.permissions.includes("admin");
  const query = useQuery({
    queryKey: [...key, "groups"],
    queryFn: ({ signal }) => client.group.getAll(undefined, { signal }),
    enabled: admin,
  });
  if (!admin) return <IdentityDenied />;
  if (!query.data) {
    if (query.isError) return <IdentityError error={query.error} retry={() => void query.refetch()} />;
    return <IdentityLoading />;
  }
  const reserved = query.data.find((group) => group.name === everyoneGroup);
  const groups = query.data
    .filter((group) => group.name !== everyoneGroup)
    .toSorted((left, right) => left.position - right.position);
  return (
    <Stack>
      <Title order={2}>{tCommon("entity.groups")}</Title>
      {query.isError && <IdentityError error={query.error} retry={() => void query.refetch()} />}
      {reserved && <EveryoneGroupCard groupId={reserved.id} presentation={presentation} />}
      <GroupsList
        groups={groups}
        presentation={presentation}
        createRequested={createRequested}
        onCloseCreate={onCloseCreate}
        writeHoldReason={writeHoldReason}
      />
    </Stack>
  );
}

function GroupsList({
  groups,
  presentation,
  createRequested,
  onCloseCreate,
  writeHoldReason,
}: GroupListPageProps & { groups: GroupList }) {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(createRequested ?? false);
  const [formKey, setFormKey] = useState(0);
  useEffect(() => {
    if (createRequested) {
      setFormKey((value) => value + 1);
      setIsCreateOpen(true);
    }
  }, [createRequested]);
  function closeCreate() {
    setIsCreateOpen(false);
    setFormKey((value) => value + 1);
    onCloseCreate?.();
  }
  function toggleCreate() {
    if (isCreateOpen) {
      closeCreate();
      return;
    }
    setFormKey((value) => value + 1);
    setIsCreateOpen(true);
  }
  const filtered = groups.filter((group) => group.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <GroupsListView
      groups={filtered}
      presentation={presentation}
      search={search}
      onSearchChange={setSearch}
      createOpen={isCreateOpen}
      onToggleCreate={toggleCreate}
      createForm={
        <GroupCreate key={formKey} onCancel={closeCreate} onCreated={closeCreate} writeHoldReason={writeHoldReason} />
      }
      writeHoldReason={writeHoldReason ?? null}
    />
  );
}

function GroupCreate({
  onCancel,
  onCreated,
  writeHoldReason,
}: {
  onCancel: () => void;
  onCreated: () => void;
  writeHoldReason?: string | null;
}) {
  const { client, demo } = useIdentity();
  const [name, setName] = useState("");
  const [validation, setValidation] = useState<string | null>(null);
  const action = useIdentityAction();
  return (
    <Stack>
      <GroupCreateForm
        name={name}
        error={validation}
        onNameChange={setName}
        onCancel={onCancel}
        isPending={action.pending}
        disabled={Boolean(writeHoldReason) || (demo.enabled && demo.readOnly)}
        onSubmit={async (event) => {
          event.preventDefault();
          const parsed = groupCreateSchema.safeParse({ name });
          if (!parsed.success) {
            setValidation(validationMessage(parsed.error.issues));
            return;
          }
          if (writeHoldReason) {
            setValidation(writeHoldReason);
            return;
          }
          setValidation(null);
          const result = await action.run((signal) => client.group.createGroup(parsed.data, { signal }));
          if (result.ok) {
            setName("");
            onCreated();
          }
        }}
      />
      <ActionFeedback action={action} />
    </Stack>
  );
}

export interface GroupEditorProps {
  groupId: string;
  presentation: GroupPresentation;
  section?: GroupSection;
  writeHoldReason?: string | null;
}

export function GroupEditor({
  groupId,
  presentation,
  section = "general",
  writeHoldReason = groupWriteHold,
}: GroupEditorProps) {
  const { client, principal } = useIdentity();
  const key = useIdentityKey();
  const admin = principal.user.permissions.includes("admin");
  const query = useQuery({
    queryKey: [...key, "group", groupId],
    queryFn: ({ signal }) => client.group.getById({ id: groupId }, { signal }),
    enabled: admin,
  });
  if (!admin) return <IdentityDenied />;
  if (!query.data) {
    if (query.isError) return <IdentityError error={query.error} retry={() => void query.refetch()} />;
    return <IdentityLoading />;
  }
  const group = query.data;
  return (
    <GroupDetailLayout groupId={group.id} groupName={group.name} section={section} presentation={presentation}>
      <Stack key={`${group.id}:${section}`}>
        {query.isError && <IdentityError error={query.error} retry={() => void query.refetch()} />}
        {writeHoldReason && <Alert title="Group writes unavailable">{writeHoldReason}</Alert>}
        {section === "general" && (
          <GroupGeneral group={group} presentation={presentation} writeHoldReason={writeHoldReason} />
        )}
        {section === "members" && (
          <GroupMembers group={group} presentation={presentation} writeHoldReason={writeHoldReason} />
        )}
        {section === "settings" && <GroupSettings group={group} writeHoldReason={writeHoldReason} />}
        {section === "permissions" && (
          <GroupPermissionEditor groupId={group.id} initialPermissions={group.permissions} />
        )}
      </Stack>
    </GroupDetailLayout>
  );
}

function GroupGeneral({
  group,
  presentation,
  writeHoldReason,
}: {
  group: GroupDetail;
  presentation: GroupPresentation;
  writeHoldReason: string | null;
}) {
  const { client, demo } = useIdentity();
  const tGeneral = useI18n("management.page.group.setting.general");
  const tDelete = useI18n("group.action.delete");
  const tCommon = useI18n("common");
  const draft = useIdentityDraft(group.name);
  const [validation, setValidation] = useState<string | null>(null);
  const reserved = group.name === everyoneGroup;
  const action = useIdentityAction();
  const deleteAction = useIdentityAction();
  const fullWidth = useMatches({ xs: true, sm: true, md: false });
  const disabled = action.pending || Boolean(writeHoldReason) || (demo.enabled && demo.readOnly);
  return (
    <Stack>
      <Title>{tGeneral("title")}</Title>
      {reserved && <ReservedGroupAlert presentation={presentation} />}
      <RenameGroupForm
        name={draft.value}
        onNameChange={draft.setValue}
        error={validation}
        reserved={reserved}
        disabled={disabled}
        isPending={action.pending}
        onSubmit={async (event) => {
          event.preventDefault();
          if (reserved) return;
          const parsed = groupUpdateSchema.safeParse({ id: group.id, name: draft.value });
          if (!parsed.success) {
            setValidation(validationMessage(parsed.error.issues));
            return;
          }
          if (writeHoldReason) {
            setValidation(writeHoldReason);
            return;
          }
          setValidation(null);
          await action.run((signal) => client.group.updateGroup(parsed.data, { signal }), {
            onSuccess: () => draft.acknowledge(parsed.data.name),
          });
        }}
      />
      <ActionFeedback action={action} />
      {draft.changed && (
        <Alert title="Group name changed remotely">Your draft is retained. Discard it to use the latest name.</Alert>
      )}
      {draft.dirty && (
        <Button
          variant="default"
          disabled={action.pending}
          onClick={() => {
            draft.discard();
            setValidation(null);
            action.clear();
          }}
        >
          {tCommon("action.discard")}
        </Button>
      )}
      <GroupOwnerCard owner={group.owner} presentation={presentation} />
      {!reserved && (
        <GroupDangerZone
          transfer={<GroupTransfer group={group} presentation={presentation} writeHoldReason={writeHoldReason} />}
          deletion={
            <Stack gap="xs">
              <InlineConfirmButton
                variant="subtle"
                color="red"
                confirmLabel={tCommon("action.confirm")}
                fullWidth={fullWidth}
                disabled={Boolean(writeHoldReason) || (demo.enabled && demo.readOnly)}
                pending={deleteAction.pending}
                onConfirm={async () => {
                  if (writeHoldReason) return;
                  await deleteAction.run((signal) => client.group.deleteGroup({ id: group.id }, { signal }), {
                    refreshAuthority: true,
                  });
                }}
              >
                {tDelete("label")}
              </InlineConfirmButton>
              <ActionFeedback action={deleteAction} />
            </Stack>
          }
        />
      )}
    </Stack>
  );
}

function GroupTransfer({
  group,
  presentation,
  writeHoldReason,
}: {
  group: GroupDetail;
  presentation: GroupPresentation;
  writeHoldReason: string | null;
}) {
  const { client, demo } = useIdentity();
  const key = useIdentityKey();
  const tTransfer = useI18n("group.action.transfer");
  const tCommon = useI18n("common");
  const [selectedOwner, setSelectedOwner] = useState<{ id: string; name: string | null } | null>(null);
  const action = useIdentityAction();
  const users = useQuery({
    queryKey: [...key, "selectable-users"],
    queryFn: ({ signal }) => client.user.selectable(undefined, { signal }),
  });
  const fullWidth = useMatches({ xs: true, sm: true, md: false });
  const disabled = Boolean(writeHoldReason) || (demo.enabled && demo.readOnly);
  if (users.isError) return <IdentityError error={users.error} retry={() => void users.refetch()} />;
  if (!selectedOwner)
    return (
      <UserAccessPicker
        users={users.data ?? []}
        presentation={presentation}
        presentUserIds={group.ownerId ? [group.ownerId] : []}
        isPending={users.isPending}
        onSelect={setSelectedOwner}
        triggerLabel={tTransfer("label")}
        triggerProps={{ variant: "subtle", color: "red", fullWidth, disabled }}
      />
    );
  return (
    <Stack gap="xs" maw={420}>
      <Text size="sm">{tTransfer("confirm", { name: group.name, username: selectedOwner.name ?? "" })}</Text>
      <Group justify="end" wrap="wrap">
        <Button variant="default" onClick={() => setSelectedOwner(null)} disabled={action.pending}>
          {tCommon("action.cancel")}
        </Button>
        <Button
          color="red"
          disabled={disabled}
          loading={action.pending}
          onClick={async () => {
            if (writeHoldReason) return;
            await action.run(
              (signal) => client.group.transferOwnership({ groupId: group.id, userId: selectedOwner.id }, { signal }),
              { refreshAuthority: true },
            );
          }}
        >
          {tCommon("action.confirm")}
        </Button>
      </Group>
      <ActionFeedback action={action} />
    </Stack>
  );
}

function GroupMembers({
  group,
  presentation,
  writeHoldReason,
}: {
  group: GroupDetail;
  presentation: GroupPresentation;
  writeHoldReason: string | null;
}) {
  const { client, locallyManagedProviders, enabledProviders, demo } = useIdentity();
  const key = useIdentityKey();
  const tMembers = useI18n("management.page.group.setting.members");
  const tAdd = useI18n("group.action.addMember");
  const allowedProviders = locallyManagedProviders.filter(
    (provider) => enabledProviders.includes(provider) && (provider === "credentials" || provider === "oidc"),
  );
  const reserved = group.name === everyoneGroup;
  let managementType: "local" | "mixed" | "external" = "mixed";
  if (allowedProviders.length === enabledProviders.length) managementType = "local";
  else if (allowedProviders.length === 0) managementType = "external";
  const editable = !reserved && managementType !== "external";
  const [search, setSearch] = useState("");
  const action = useIdentityAction();
  const users = useQuery({
    queryKey: [...key, "member-candidates", allowedProviders],
    queryFn: ({ signal }) => client.user.selectable({ providers: allowedProviders }, { signal }),
    enabled: editable,
  });
  const filtered = group.members.filter(
    (member) => !search.trim() || member.name?.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const disabled = Boolean(writeHoldReason) || (demo.enabled && demo.readOnly);
  return (
    <Stack>
      <Title>{tMembers("title")}</Title>
      <MembershipNotice reserved={reserved} managementType={managementType} presentation={presentation} />
      <Group justify="space-between">
        <TextInput
          leftSection={<IconSearch size={20} stroke={1.5} />}
          placeholder={`${tMembers("search")}...`}
          aria-label={tMembers("search")}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />
        {editable && (
          <UserAccessPicker
            users={users.data ?? []}
            presentation={presentation}
            presentUserIds={group.members.map((member) => member.id)}
            isPending={users.isPending}
            triggerLabel={tAdd("label")}
            triggerProps={{ disabled: disabled || action.pending }}
            onSelect={async (user) => {
              if (disabled) return;
              await action.run((signal) => client.group.addMember({ groupId: group.id, userId: user.id }, { signal }), {
                refreshAuthority: true,
              });
            }}
          />
        )}
      </Group>
      {users.isError && <IdentityError error={users.error} retry={() => void users.refetch()} />}
      <ActionFeedback action={action} />
      {filtered.length === 0 && <EmptyMembers />}
      <Table striped highlightOnHover>
        <Table.Tbody>
          {filtered.map((member) => (
            <Table.Tr key={member.id}>
              <Table.Td>
                <MemberIdentity member={member} presentation={presentation} />
              </Table.Td>
              <Table.Td w={100}>
                {!reserved &&
                  (member.provider === "credentials" ||
                    (member.provider === "oidc" && locallyManagedProviders.includes("oidc"))) && (
                    <RemoveGroupMember groupId={group.id} userId={member.id} disabled={disabled} />
                  )}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}

function RemoveGroupMember({ groupId, userId, disabled }: { groupId: string; userId: string; disabled: boolean }) {
  const { client } = useIdentity();
  const tCommon = useI18n("common");
  const action = useIdentityAction();
  return (
    <Stack gap="xs">
      <InlineConfirmButton
        variant="subtle"
        color="red.9"
        size="compact-sm"
        confirmLabel={tCommon("action.confirm")}
        disabled={disabled}
        pending={action.pending}
        onConfirm={async () => {
          if (disabled) return;
          await action.run((signal) => client.group.removeMember({ groupId, userId }, { signal }), {
            refreshAuthority: true,
          });
        }}
      >
        {tCommon("action.remove")}
      </InlineConfirmButton>
      <ActionFeedback action={action} />
    </Stack>
  );
}

function GroupSettings({ group, writeHoldReason }: { group: GroupDetail; writeHoldReason: string | null }) {
  const { client, demo } = useIdentity();
  const key = useIdentityKey();
  const tSettings = useI18n("management.page.group.setting.setting");
  const tEntities = useI18n("common.entity");
  const tCommon = useI18n("common");
  const draft = useIdentityDraft({ homeBoardId: group.homeBoardId, mobileHomeBoardId: group.mobileHomeBoardId });
  const [validation, setValidation] = useState<string | null>(null);
  const action = useIdentityAction();
  const boards = useQuery({
    queryKey: [...key, "group-boards", group.id],
    queryFn: ({ signal }) => client.board.getBoardsForGroup({ groupId: group.id }, { signal }),
  });
  return (
    <Stack>
      <Title>{tSettings("title")}</Title>
      <Alert color="cyan" icon={<IconExclamationCircle size="1rem" stroke={1.5} />}>
        {tSettings("alert")}
      </Alert>
      <Title order={3}>{tEntities("boards")}</Title>
      {boards.isError && <IdentityError error={boards.error} retry={() => void boards.refetch()} />}
      {boards.isPending ? (
        <IdentityLoading />
      ) : (
        <GroupHomeBoards
          boards={boards.data ?? []}
          homeBoardId={draft.value.homeBoardId}
          mobileHomeBoardId={draft.value.mobileHomeBoardId}
          onHomeBoardChange={(homeBoardId) => draft.setValue({ ...draft.value, homeBoardId })}
          onMobileHomeBoardChange={(mobileHomeBoardId) => draft.setValue({ ...draft.value, mobileHomeBoardId })}
          disabled={Boolean(writeHoldReason) || boards.isError || action.pending || (demo.enabled && demo.readOnly)}
          isPending={action.pending}
          onSubmit={async (event) => {
            event.preventDefault();
            const settings = {
              ...(draft.value.homeBoardId !== draft.baseline.homeBoardId
                ? { homeBoardId: draft.value.homeBoardId }
                : {}),
              ...(draft.value.mobileHomeBoardId !== draft.baseline.mobileHomeBoardId
                ? { mobileHomeBoardId: draft.value.mobileHomeBoardId }
                : {}),
            };
            const parsed = groupSavePartialSettingsSchema.safeParse({ id: group.id, settings });
            if (!parsed.success) {
              setValidation(validationMessage(parsed.error.issues));
              return;
            }
            if (writeHoldReason) {
              setValidation(writeHoldReason);
              return;
            }
            setValidation(null);
            await action.run((signal) => client.group.savePartialSettings(parsed.data, { signal }), {
              refreshAuthority: true,
            });
          }}
        />
      )}
      {validation && <IdentityError error={validation} />}
      <ActionFeedback action={action} />
      {draft.changed && (
        <Alert title="Home boards changed remotely">
          Your draft and original baseline are retained. Discard changes to use the latest settings.
        </Alert>
      )}
      {draft.dirty && (
        <Button
          variant="default"
          disabled={action.pending}
          onClick={() => {
            draft.discard();
            setValidation(null);
            action.clear();
          }}
        >
          {tCommon("action.discard")}
        </Button>
      )}
    </Stack>
  );
}
