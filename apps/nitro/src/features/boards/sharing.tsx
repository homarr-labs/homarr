import { useMemo, useState } from "react";
import { Alert, Button, Fieldset, Group, Select, Skeleton, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import type { BoardClient, BoardDomainResources, BoardIdentity, BoardOutputs, BoardPermission } from "./contracts";
import { boardDraftPersistenceHold } from "./contracts";
import { BoardError } from "./errors";
import { boardQueryKeys } from "./navigation";
import { useBoardSnapshotDraft } from "./snapshot-draft";

export interface BoardPermissionPrincipals {
  users: readonly { id: string; name: string }[];
  groups: readonly { id: string; name: string }[];
}

interface BoardSharingProps {
  client: BoardClient;
  identity: BoardIdentity;
  resources: BoardDomainResources;
  boardId: string;
  principals?: BoardPermissionPrincipals;
}

export function BoardSharing(props: BoardSharingProps) {
  const query = useQuery({
    queryKey: boardQueryKeys.permissions(props.identity.resourceKey, props.boardId),
    queryFn: ({ signal }) => props.client.board.getBoardPermissions({ id: props.boardId }, { signal }),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  if (query.data === undefined)
    return query.isError ? (
      <BoardError error={query.error} retry={() => void query.refetch()} />
    ) : (
      <Skeleton height={180} />
    );
  return (
    <Stack>
      {query.isError && <BoardError error={query.error} retry={() => void query.refetch()} />}
      <PermissionDraft key={`${props.identity.resourceKey}:${props.boardId}`} {...props} initial={query.data} />
    </Stack>
  );
}

function PermissionDraft(props: BoardSharingProps & { initial: BoardOutputs["getBoardPermissions"] }) {
  const canonical = useMemo(
    () => ({
      snapshot: props.initial,
      users: props.initial.users.map(({ user, permission }) => ({ principalId: user.id, permission })),
      groups: props.initial.groups.map(({ group, permission }) => ({ principalId: group.id, permission })),
    }),
    [props.initial],
  );
  const draft = useBoardSnapshotDraft(canonical);
  const { users, groups } = draft.value;
  const [error, setError] = useState<unknown>(null);
  const userNames = new Map<string, string>();
  for (const { user } of [...draft.baseline.snapshot.users, ...props.initial.users])
    userNames.set(user.id, user.name || user.email || user.id);
  for (const { id, name } of props.principals?.users ?? []) userNames.set(id, name);
  const groupNames = new Map<string, string>();
  for (const { group } of [...draft.baseline.snapshot.groups, ...props.initial.groups])
    groupNames.set(group.id, group.name);
  for (const { id, name } of props.principals?.groups ?? []) groupNames.set(id, name);
  const validate = () => {
    try {
      for (const permissions of [users, groups]) {
        props.resources.schemas.boardSavePermissionsSchema.parse({ entityId: props.boardId, permissions });
        if (new Set(permissions.map(({ principalId }) => principalId)).size !== permissions.length)
          throw new Error("A user or group can only have one direct board permission.");
      }
      setError(null);
    } catch (failure) {
      setError(failure);
    }
  };
  return (
    <Fieldset legend="Board access">
      <Stack>
        <Alert color="yellow">
          User and group permission changes are a local draft. {boardDraftPersistenceHold.reason}.
        </Alert>
        {error !== null && <BoardError error={error} />}
        {draft.conflict && (
          <Alert color="yellow" title="Board access changed since editing began">
            <Stack gap="xs">
              <Text size="sm">
                Your direct-access draft retains its captured baseline. Reloading discards it and adopts the latest
                access snapshot.
              </Text>
              <Button
                variant="default"
                onClick={() => {
                  draft.reload();
                  setError(null);
                }}
              >
                Discard draft and reload latest access
              </Button>
            </Stack>
          </Alert>
        )}
        <Text fw={500}>Inherited group access</Text>
        {props.initial.inherited.length === 0 ? (
          <Text size="sm">No inherited group permissions.</Text>
        ) : (
          props.initial.inherited.map(({ group, permission }) => (
            <Text key={`${group.id}:${permission}`} size="sm">
              {group.name}: {permission}
            </Text>
          ))
        )}
        <PermissionRows
          title="Users"
          permissions={users}
          names={userNames}
          available={props.principals?.users}
          onChange={(users) => draft.update((previous) => ({ ...previous, users }))}
        />
        <PermissionRows
          title="Groups"
          permissions={groups}
          names={groupNames}
          available={props.principals?.groups}
          onChange={(groups) => draft.update((previous) => ({ ...previous, groups }))}
        />
        <Group justify="flex-end">
          <Button
            variant="default"
            disabled={!draft.dirty}
            onClick={() => {
              draft.reload();
              setError(null);
            }}
          >
            Discard access changes
          </Button>
          <Button variant="default" onClick={validate}>
            Validate access draft
          </Button>
          <Button disabled title={boardDraftPersistenceHold.reason}>
            Save access changes
          </Button>
        </Group>
      </Stack>
    </Fieldset>
  );
}

function PermissionRows({
  title,
  permissions,
  names,
  available,
  onChange,
}: {
  title: string;
  permissions: BoardPermission[];
  names: ReadonlyMap<string, string>;
  available?: readonly { id: string; name: string }[];
  onChange: (permissions: BoardPermission[]) => void;
}) {
  const unused = available?.filter(({ id }) => !permissions.some(({ principalId }) => principalId === id));
  return (
    <Stack gap="sm">
      <Text fw={500}>{title}</Text>
      {permissions.length === 0 && <Text size="sm">No direct {title.toLocaleLowerCase()} access.</Text>}
      {permissions.map((entry) => (
        <Group key={entry.principalId} justify="space-between">
          <Text>{names.get(entry.principalId) ?? entry.principalId}</Text>
          <Group>
            <Select
              aria-label={`Permission for ${names.get(entry.principalId) ?? entry.principalId}`}
              value={entry.permission}
              data={[
                { value: "view", label: "View board" },
                { value: "modify", label: "Modify board" },
                { value: "full", label: "Full access" },
              ]}
              onChange={(permission) => {
                if (permission === "view" || permission === "modify" || permission === "full")
                  onChange(
                    permissions.map((previous) =>
                      previous.principalId === entry.principalId ? { ...previous, permission } : previous,
                    ),
                  );
              }}
            />
            <Button
              variant="subtle"
              color="red"
              onClick={() => onChange(permissions.filter(({ principalId }) => principalId !== entry.principalId))}
            >
              Remove access
            </Button>
          </Group>
        </Group>
      ))}
      <Select
        label={`Add ${title === "Users" ? "user" : "group"}`}
        searchable
        value={null}
        disabled={!unused || unused.length === 0}
        description={!available ? "The principal directory has not been composed into this workspace." : undefined}
        data={unused?.map(({ id, name }) => ({ value: id, label: name })) ?? []}
        onChange={(principalId) => {
          if (principalId) onChange([...permissions, { principalId, permission: "view" }]);
        }}
      />
    </Stack>
  );
}
