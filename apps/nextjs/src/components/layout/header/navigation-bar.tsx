"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Group, NavLink } from "@mantine/core";

import { clientApi } from "@homarr/api/client";

export const NavigationBar = () => {
  const { data: boards = [] } = clientApi.board.getAllBoards.useQuery(undefined, {
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  const pathname = usePathname();

  // Filter boards that should be shown in navigation
  const navigationBoards = boards.filter((board) => board.showInNavigation);

  if (navigationBoards.length === 0) {
    return null;
  }

  return (
    <Group gap="xs" wrap="nowrap" style={{ overflow: 'auto', maxWidth: '100%' }}>
      {navigationBoards.map((board) => {
        const boardUrl = `/boards/${board.name}`;
        const isActive = pathname === boardUrl;

        return (
          <NavLink
            key={board.id}
            component={Link}
            href={boardUrl}
            label={board.name}
            active={isActive}
            variant="subtle"
            style={{
              borderRadius: 5,
              padding: '0 10px',
            }}
          />
        );
      })}
    </Group>
  );
}; 