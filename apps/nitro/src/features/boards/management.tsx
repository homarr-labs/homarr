import { useState } from "react";
import {
  Anchor,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Skeleton,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { BoardClient, BoardDomainResources, BoardIdentity, BoardOutputs } from "./contracts";
import { boardHref, getBoardAccess } from "./contracts";
import { BoardError } from "./errors";
import { boardQueryKeys } from "./navigation";
import classes from "./boards.module.css";

type ManagedBoard = BoardOutputs["getAllBoards"][number];
type BoardManagementAction =
  | { kind: "create"; name: string; columnCount: number; isPublic: boolean }
  | { kind: "duplicate"; board: ManagedBoard; name: string }
  | { kind: "rename"; board: ManagedBoard; name: string }
  | { kind: "visibility"; board: ManagedBoard; visibility: "public" | "private" }
  | { kind: "delete"; board: ManagedBoard }
  | { kind: "home"; board: ManagedBoard }
  | { kind: "mobileHome"; board: ManagedBoard };

interface BoardManagementProps {
  client: BoardClient;
  identity: BoardIdentity;
  resources: BoardDomainResources;
  onNavigate?: (href: string) => void;
}

export function BoardManagement(props: BoardManagementProps) {
  return <ScopedBoardManagement key={props.identity.resourceKey} {...props} />;
}

function ScopedBoardManagement(props: BoardManagementProps) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: boardQueryKeys.list(props.identity.resourceKey),
    queryFn: ({ signal }) => props.client.board.getAllBoards(undefined, { signal }),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<BoardManagementAction | null>(null);
  const mutation = useMutation({
    mutationFn: async (input: BoardManagementAction) => {
      const board = props.client.board;
      switch (input.kind) {
        case "create": {
          const value = props.resources.schemas.boardCreateSchema.parse({
            name: input.name,
            columnCount: input.columnCount,
            isPublic: input.isPublic,
          });
          const result = await board.createBoard(value);
          return { href: boardHref(result.name) };
        }
        case "duplicate":
          await board.duplicateBoard({ id: input.board.id, name: input.name });
          return { href: boardHref(input.name) };
        case "rename":
          await board.renameBoard({ id: input.board.id, name: input.name });
          return { href: null };
        case "visibility":
          await board.changeBoardVisibility({ id: input.board.id, visibility: input.visibility });
          return { href: null };
        case "delete":
          await board.deleteBoard({ id: input.board.id });
          return { href: null };
        case "home":
          await board.setHomeBoard({ id: input.board.id });
          return { href: null };
        case "mobileHome":
          await board.setMobileHomeBoard({ id: input.board.id });
          return { href: null };
      }
    },
    retry: false,
    onSuccess: async ({ href }) => {
      await queryClient.invalidateQueries({ queryKey: boardQueryKeys.all(props.identity.resourceKey) });
      setAction(null);
      if (href) props.onNavigate?.(href);
    },
  });
  const openAction = (next: BoardManagementAction) => {
    mutation.reset();
    setAction(next);
  };
  const canCreate = props.identity.userId !== null && props.identity.permissions.includes("board-create");
  return (
    <Stack>
      <Group justify="space-between">
        <Title order={1}>Boards</Title>
        {canCreate && (
          <Button onClick={() => openAction({ kind: "create", name: "", columnCount: 10, isPublic: false })}>
            Create board
          </Button>
        )}
      </Group>
      <TextInput label="Search boards" value={search} onChange={(event) => setSearch(event.currentTarget.value)} />
      {query.isPending ? (
        <Skeleton height={160} />
      ) : query.isError ? (
        <BoardError error={query.error} retry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <Text>No accessible boards. Create a board or ask its owner for access.</Text>
      ) : (
        query.data
          .filter(({ name }) => name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
          .map((board) => {
            const access = getBoardAccess(board, props.identity);
            return (
              <Stack key={board.id} className={classes.summary} gap="sm">
                <Group justify="space-between">
                  <Anchor className={classes.summaryTitle} href={boardHref(board.name)}>
                    {board.name}
                  </Anchor>
                  <Group gap="xs">
                    <Badge variant="default">{board.isPublic ? "Public" : "Private"}</Badge>
                    {board.isHome && <Badge variant="default">Home</Badge>}
                    {board.isMobileHome && <Badge variant="default">Mobile home</Badge>}
                  </Group>
                </Group>
                <Text size="sm">{board.creator?.name || "Unknown owner"}</Text>
                <Group gap="xs">
                  {props.identity.userId !== null && (
                    <>
                      <Button
                        variant="default"
                        size="xs"
                        disabled={board.isHome}
                        onClick={() => openAction({ kind: "home", board })}
                      >
                        Set desktop home
                      </Button>
                      <Button
                        variant="default"
                        size="xs"
                        disabled={board.isMobileHome}
                        onClick={() => openAction({ kind: "mobileHome", board })}
                      >
                        Set mobile home
                      </Button>
                    </>
                  )}
                  {canCreate && (
                    <Button
                      variant="default"
                      size="xs"
                      onClick={() => openAction({ kind: "duplicate", board, name: `${board.name}-copy`.slice(0, 255) })}
                    >
                      Duplicate board
                    </Button>
                  )}
                  {access.modify && (
                    <Button component="a" href={`${boardHref(board.name)}/settings`} variant="default" size="xs">
                      Board settings
                    </Button>
                  )}
                  {access.full && (
                    <>
                      <Button
                        variant="default"
                        size="xs"
                        onClick={() => openAction({ kind: "rename", board, name: board.name })}
                      >
                        Rename board
                      </Button>
                      <Button
                        variant="default"
                        size="xs"
                        onClick={() =>
                          openAction({ kind: "visibility", board, visibility: board.isPublic ? "private" : "public" })
                        }
                      >
                        {board.isPublic ? "Make private" : "Make public"}
                      </Button>
                      <Button
                        variant="subtle"
                        color="red"
                        size="xs"
                        onClick={() => openAction({ kind: "delete", board })}
                      >
                        Delete board
                      </Button>
                    </>
                  )}
                </Group>
              </Stack>
            );
          })
      )}
      {action && (
        <ManagementActionForm
          key={action.kind === "create" ? "create" : `${action.kind}:${action.board.id}`}
          action={action}
          client={props.client}
          identity={props.identity}
          pending={mutation.isPending}
          error={mutation.error}
          onSubmit={(input) => mutation.mutate(input)}
          onClose={() => {
            if (!mutation.isPending) setAction(null);
          }}
        />
      )}
    </Stack>
  );
}

function ManagementActionForm({
  action,
  client,
  identity,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  action: BoardManagementAction;
  client: BoardClient;
  identity: BoardIdentity;
  pending: boolean;
  error: unknown;
  onSubmit: (action: BoardManagementAction) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(action);
  const [confirmedName, setConfirmedName] = useState("");
  const names = {
    create: "Create board",
    duplicate: "Duplicate board",
    rename: "Rename board",
    visibility: "Change board visibility",
    delete: "Delete board",
    home: "Set desktop home board",
    mobileHome: "Set mobile home board",
  };
  const hasName = value.kind === "create" || value.kind === "duplicate" || value.kind === "rename";
  const invalidName =
    hasName && (value.name.length === 0 || value.name.length > 255 || !/^[A-Za-z0-9-_]+$/.test(value.name));
  const mustCheckName = value.kind === "create" || value.kind === "duplicate";
  const name = hasName ? value.name : "";
  const nameQuery = useQuery({
    queryKey: ["boards", identity.resourceKey, "exists", name],
    queryFn: async ({ signal }) => ({ name, exists: await client.board.exists(name, { signal }) }),
    enabled: mustCheckName && !invalidName,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const nameAvailable =
    nameQuery.isSuccess &&
    nameQuery.fetchStatus === "idle" &&
    !nameQuery.isPlaceholderData &&
    nameQuery.isFetchedAfterMount &&
    nameQuery.data.name === name &&
    nameQuery.data.exists === false;
  const nameUnavailable = mustCheckName && !nameAvailable;
  return (
    <Modal
      opened
      onClose={onClose}
      title={names[value.kind]}
      closeOnEscape={!pending}
      closeOnClickOutside={!pending}
      withCloseButton={!pending}
      transitionProps={{ duration: 0 }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (
            !pending &&
            !invalidName &&
            !nameUnavailable &&
            (value.kind !== "delete" || confirmedName === value.board.name)
          )
            onSubmit(value);
        }}
      >
        <Stack>
          {error !== null && error !== undefined && <BoardError error={error} />}
          {mustCheckName && nameQuery.isError && (
            <BoardError error={nameQuery.error} retry={() => void nameQuery.refetch()} />
          )}
          {mustCheckName &&
            nameQuery.isSuccess &&
            nameQuery.fetchStatus === "idle" &&
            !nameQuery.isPlaceholderData &&
            nameQuery.data.name === name &&
            nameQuery.data.exists && <Text c="red">A board with this name already exists.</Text>}
          {hasName && (
            <TextInput
              label="Board name"
              description="Letters, numbers, hyphens, and underscores."
              value={value.name}
              maxLength={255}
              disabled={pending}
              onChange={(event) => setValue({ ...value, name: event.currentTarget.value })}
              data-autofocus
              required
              error={
                invalidName && value.name.length > 0 ? "Use letters, numbers, hyphens, and underscores." : undefined
              }
            />
          )}
          {value.kind === "create" && (
            <>
              <NumberInput
                label="Columns"
                value={value.columnCount}
                min={1}
                max={24}
                allowDecimal={false}
                disabled={pending}
                onChange={(input) => {
                  if (typeof input === "number") setValue({ ...value, columnCount: input });
                }}
              />
              <Switch
                label="Public board"
                checked={value.isPublic}
                disabled={pending}
                onChange={(event) => setValue({ ...value, isPublic: event.currentTarget.checked })}
              />
            </>
          )}
          {value.kind === "visibility" && (
            <Text>
              {value.visibility === "public"
                ? "Anyone will be able to view this board. Its linked integrations remain permission-protected."
                : "Only permitted users and groups will be able to view this board. Instance home boards cannot be made private."}
            </Text>
          )}
          {value.kind === "delete" && (
            <>
              <Text>Delete {value.board.name} and its dashboard content? This cannot be undone.</Text>
              <TextInput
                label={`Type ${value.board.name} to confirm`}
                value={confirmedName}
                disabled={pending}
                onChange={(event) => setConfirmedName(event.currentTarget.value)}
                data-autofocus
              />
            </>
          )}
          {value.kind === "home" && <Text>Use {value.board.name} as your desktop home board.</Text>}
          {value.kind === "mobileHome" && <Text>Use {value.board.name} as your mobile home board.</Text>}
          <Group justify="flex-end">
            <Button variant="default" disabled={pending} onClick={onClose}>
              Cancel action
            </Button>
            <Button
              type="submit"
              color={value.kind === "delete" ? "red" : undefined}
              loading={pending}
              disabled={
                invalidName || nameUnavailable || (value.kind === "delete" && confirmedName !== value.board.name)
              }
            >
              {names[value.kind]}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
