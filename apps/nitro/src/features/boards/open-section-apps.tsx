import { useState } from "react";
import { Anchor, Button, Modal, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import type { Board, BoardAppsClient, BoardDomainResources, BoardIdentity } from "./contracts";
import { BoardError } from "./errors";

export function getSectionItemsForLayout(board: Board, sectionId: string, layoutId: string) {
  const children = new Map<string, string[]>();
  for (const section of board.sections) {
    if (section.kind !== "container") continue;
    const layout = section.layouts.find((value) => value.layoutId === layoutId);
    if (!layout) continue;
    children.set(layout.parentSectionId, [...(children.get(layout.parentSectionId) ?? []), section.id]);
  }
  const included = new Set([sectionId]);
  const queue = [sectionId];
  for (const id of queue) {
    for (const childId of children.get(id) ?? []) {
      if (included.has(childId)) continue;
      included.add(childId);
      queue.push(childId);
    }
  }
  return board.items.filter((item) =>
    item.layouts.some((layout) => layout.layoutId === layoutId && included.has(layout.sectionId)),
  );
}

export function BoardSectionOpenAll(props: {
  client: BoardAppsClient;
  identity: BoardIdentity;
  resources: BoardDomainResources;
  board: Board;
  sectionId: string;
  layoutId: string;
  label: string;
}) {
  const [blocked, setBlocked] = useState(false);
  const appIds = [
    ...new Set(
      getSectionItemsForLayout(props.board, props.sectionId, props.layoutId).flatMap((item) =>
        item.kind === "app" && typeof item.options.appId === "string" && item.options.appId.length > 0
          ? [item.options.appId]
          : [],
      ),
    ),
  ];
  const query = useQuery({
    queryKey: [
      "boards",
      props.identity.resourceKey,
      "sectionApps",
      props.board.id,
      props.sectionId,
      props.layoutId,
      appIds,
    ],
    queryFn: ({ signal }) => props.client.app.byIds(appIds, { signal }),
    enabled: appIds.length > 0,
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const apps =
    query.data?.flatMap((app) => {
      const href = props.resources.getSafeAppHref(app.href);
      return href ? [{ id: app.id, name: app.name, href }] : [];
    }) ?? [];
  return (
    <>
      <Button
        size="xs"
        variant="subtle"
        loading={appIds.length > 0 && query.isPending}
        disabled={apps.length === 0}
        aria-label={`Open all apps in ${props.label}`}
        onClick={() => {
          for (const app of apps) {
            const tab = window.open(app.href, "_blank");
            if (!tab) {
              setBlocked(true);
              break;
            }
            tab.opener = null;
          }
        }}
      >
        Open all apps
      </Button>
      {query.isError && <BoardError error={query.error} retry={() => void query.refetch()} />}
      <Modal
        opened={blocked}
        onClose={() => setBlocked(false)}
        title="Allow opening multiple tabs"
        transitionProps={{ duration: 0 }}
      >
        <Stack>
          <Text>Your browser blocked an app tab. Allow popups for Homarr, or open the apps below individually.</Text>
          {apps.map((app) => (
            <Anchor key={app.id} href={app.href} target="_blank" rel="noopener noreferrer">
              {app.name}
            </Anchor>
          ))}
        </Stack>
      </Modal>
    </>
  );
}
