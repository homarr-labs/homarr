"use client";

import { Group, Menu, ScrollArea, Text, UnstyledButton } from "@mantine/core";
import { IconCheck, IconChevronDown, IconLayoutBoard } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

import { useIsMobileBoard } from "~/components/board/use-mobile-board";
import { BoardLogo, BoardLogoWithTitle } from "~/components/layout/logo/board-logo";

export const BoardSwitcherLogo = () => {
  const board = useRequiredBoard();
  const t = useI18n();
  const isMobileBoard = useIsMobileBoard();
  const { data: boards = [] } = clientApi.board.getAllBoards.useQuery(undefined, { enabled: isMobileBoard });

  if (!isMobileBoard) {
    return (
      <UnstyledButton component={Link} href="/">
        <BoardLogoWithTitle size="md" hideTitleOnMobile />
      </UnstyledButton>
    );
  }

  return (
    <Menu position="bottom-start" width={280}>
      <Menu.Target>
        <UnstyledButton
          aria-label={`${t("board.mobile.currentBoard")}: ${board.name}`}
          maw="min(42vw, 20rem)"
          mih={44}
          px={4}
        >
          <Group gap="xs" wrap="nowrap">
            <BoardLogo size={28} />
            <Text fw={600} truncate title={board.name}>
              {board.name}
            </Text>
            <IconChevronDown size={16} aria-hidden />
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{t("board.mobile.currentBoard")}</Menu.Label>
        <ScrollArea.Autosize mah={320}>
          {boards.map((availableBoard) => {
            const isCurrent = availableBoard.id === board.id;
            return (
              <Menu.Item
                key={availableBoard.id}
                component={Link}
                href={`/boards/${availableBoard.name}`}
                leftSection={isCurrent ? <IconCheck size={20} /> : <IconLayoutBoard size={20} />}
                aria-current={isCurrent ? "page" : undefined}
              >
                <Text truncate title={availableBoard.name}>
                  {availableBoard.name}
                </Text>
              </Menu.Item>
            );
          })}
        </ScrollArea.Autosize>
      </Menu.Dropdown>
    </Menu>
  );
};
