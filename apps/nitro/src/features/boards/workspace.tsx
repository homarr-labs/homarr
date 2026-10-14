import { Skeleton, Stack } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import type { BoardClient, BoardTarget } from "./contracts";
import type { BoardEditorProps } from "./editor";
import { BoardEditor } from "./editor";
import { BoardError } from "./errors";

export interface BoardWorkspaceProps extends Omit<BoardEditorProps, "board"> {
  client: BoardClient;
  target: BoardTarget;
}

export function BoardWorkspace(props: BoardWorkspaceProps) {
  const name = props.target.kind === "named" ? props.target.name : null;
  const query = useQuery({
    queryKey: ["boards", props.identity.resourceKey, props.target.kind, name],
    queryFn: ({ signal }) =>
      props.target.kind === "home"
        ? props.client.board.getHomeBoard(undefined, { signal })
        : props.client.board.getBoardByName({ name: props.target.name }, { signal }),
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
  if (query.isPending)
    return (
      <Stack>
        <Skeleton height={48} />
        <Skeleton height={320} />
      </Stack>
    );
  if (query.isError) return <BoardError error={query.error} retry={() => void query.refetch()} />;
  return (
    <BoardEditor
      key={`${props.identity.resourceKey}:${query.data.id}:${name ?? "home"}`}
      {...props}
      board={query.data}
    />
  );
}
