import type { ReactNode } from "react";
import { useState } from "react";
import { Anchor, Badge, Button, Group, Modal, Skeleton, Stack, Text, TextInput } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import type { BoardClient, BoardIdentity, BoardOutputs } from "./contracts";
import { boardHref } from "./contracts";
import { BoardError } from "./errors";
import classes from "./boards.module.css";

export const boardQueryKeys = {
  all: (resourceKey: string) => ["boards", resourceKey] as const,
  list: (resourceKey: string) => ["boards", resourceKey, "getAllBoards"] as const,
  overview: (resourceKey: string) => ["boards", resourceKey, "getManageOverview", { previewRowLimit: 12 }] as const,
  settings: (resourceKey: string, id: string) => ["boards", resourceKey, "getBoardSettings", id] as const,
  permissions: (resourceKey: string, id: string) => ["boards", resourceKey, "getBoardPermissions", id] as const,
};

interface BoardNavigationProps {
  client: BoardClient;
  identity: BoardIdentity;
  currentBoardId?: string;
  onNavigate?: (href: string) => void;
}

export function BoardNavigation(props: BoardNavigationProps) {
  const query = useQuery({
    queryKey: boardQueryKeys.list(props.identity.resourceKey),
    queryFn: ({ signal }) => props.client.board.getAllBoards(undefined, { signal }),
    retry: false,
    refetchOnWindowFocus: false,
  });
  if (query.isPending) return <Skeleton height={36} />;
  if (query.isError) return <BoardError error={query.error} retry={() => void query.refetch()} />;
  return (
    <nav aria-label="Boards" className={classes.navigation}>
      {query.data.map((board) => (
        <Anchor
          key={board.id}
          href={boardHref(board.name)}
          aria-current={props.currentBoardId === board.id ? "page" : undefined}
          onClick={(event) => {
            if (
              !props.onNavigate ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey ||
              event.button !== 0
            )
              return;
            event.preventDefault();
            props.onNavigate(boardHref(board.name));
          }}
        >
          {board.name}
          {board.isHome ? " (Home)" : ""}
          {board.isMobileHome ? " (Mobile home)" : ""}
        </Anchor>
      ))}
      <Anchor href="/manage/boards">Manage boards</Anchor>
    </nav>
  );
}

export interface BoardSwitcherProps extends BoardNavigationProps {
  renderPreview?: (board: BoardOutputs["getManageOverview"][number]) => ReactNode;
}

export function BoardSwitcher(props: BoardSwitcherProps) {
  const [opened, setOpened] = useState(false);
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: boardQueryKeys.overview(props.identity.resourceKey),
    queryFn: ({ signal }) => props.client.board.getManageOverview({ previewRowLimit: 12 }, { signal }),
    enabled: opened,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const filtered = query.data
    ?.filter(({ name }) => name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    .toSorted((a, b) => Number(a.id === props.currentBoardId) - Number(b.id === props.currentBoardId));
  return (
    <>
      <Button variant="default" onClick={() => setOpened(true)}>
        Switch board
      </Button>
      <Modal
        opened={opened}
        onClose={() => {
          setOpened(false);
          setSearch("");
        }}
        title="Switch board"
        size="lg"
        transitionProps={{ duration: 0 }}
      >
        <Stack>
          <TextInput
            label="Search boards"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            data-autofocus
          />
          {query.isPending ? (
            <Skeleton height={120} />
          ) : query.isError ? (
            <BoardError error={query.error} retry={() => void query.refetch()} />
          ) : filtered?.length === 0 ? (
            <Text>
              {query.data.length === 0
                ? "No accessible boards. Create a board or ask its owner for access."
                : "No boards match this search."}
            </Text>
          ) : (
            filtered?.map((board) => (
              <Stack key={board.id} className={classes.summary} gap="xs">
                {props.renderPreview?.(board)}
                <Group justify="space-between">
                  <Anchor
                    href={boardHref(board.name)}
                    className={classes.summaryTitle}
                    aria-current={board.id === props.currentBoardId ? "page" : undefined}
                    onClick={(event) => {
                      if (
                        !props.onNavigate ||
                        event.metaKey ||
                        event.ctrlKey ||
                        event.shiftKey ||
                        event.altKey ||
                        event.button !== 0
                      )
                        return;
                      event.preventDefault();
                      props.onNavigate(boardHref(board.name));
                      setOpened(false);
                    }}
                  >
                    {board.name}
                  </Anchor>
                  <Group gap="xs">
                    {board.isHome && <Badge variant="default">Home</Badge>}
                    {board.isMobileHome && <Badge variant="default">Mobile home</Badge>}
                    <Badge variant="default">{board.isPublic ? "Public" : "Private"}</Badge>
                  </Group>
                </Group>
                <Text size="sm">{board.creator?.name || "Unknown owner"}</Text>
              </Stack>
            ))
          )}
        </Stack>
      </Modal>
    </>
  );
}
