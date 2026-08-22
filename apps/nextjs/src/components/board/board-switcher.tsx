"use client";

import type { KeyboardEvent, ReactNode, RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  Center,
  Group,
  Kbd,
  Loader,
  Modal,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
  useMatches,
  VisuallyHidden,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { IconArrowDown, IconArrowRight, IconLayoutBoard, IconReplace } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useOptionalBoard } from "@homarr/boards/context";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

import { BoardLayoutThumbnail } from "~/components/board/board-layout-thumbnail";

import classes from "./board-switcher.module.css";

export const boardSwitcherHotkey = "shift+c";

interface BoardSwitcherProps {
  children: (controls: { open: () => void; preload: () => void; hotkey: string }) => ReactNode;
}

export const BoardSwitcher = ({ children }: BoardSwitcherProps) => {
  const t = useI18n("board.action.switcher");
  const currentBoard = useOptionalBoard();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const responsiveColumnCount = useMatches({ base: 1, sm: 2, lg: 3, xl: 4 });
  const optionRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const utils = clientApi.useUtils();
  const {
    data: boards = [],
    isPending,
    isError,
  } = clientApi.board.getManageOverview.useQuery(undefined, {
    enabled: isOpen,
  });

  const availableBoards = useMemo(
    () => boards.filter((board) => board.id !== currentBoard?.id),
    [boards, currentBoard?.id],
  );
  const filteredBoards = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    if (normalizedSearch.length === 0) return availableBoards;
    return availableBoards.filter((board) => board.name.toLocaleLowerCase().includes(normalizedSearch));
  }, [availableBoards, search]);
  const columnCount = Math.max(1, Math.min(filteredBoards.length, responsiveColumnCount));

  const openSwitcher = useCallback(() => {
    setIsOpen(true);
  }, []);
  const closeSwitcher = useCallback(() => {
    setIsOpen(false);
    setSearch("");
    setActiveIndex(0);
  }, []);
  const preloadBoards = () => void utils.board.getManageOverview.prefetch();

  useHotkeys([[boardSwitcherHotkey, openSwitcher, { preventDefault: true }]]);

  useEffect(() => {
    if (!isOpen || filteredBoards.length === 0) return;
    const normalizedIndex = Math.min(activeIndex, filteredBoards.length - 1);
    if (normalizedIndex !== activeIndex) {
      setActiveIndex(normalizedIndex);
      return;
    }
    optionRefs.current[normalizedIndex]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeIndex, filteredBoards.length, isOpen]);

  const handleModalKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      setSearch((current) => current.slice(0, -1));
      setActiveIndex(0);
      return;
    }

    if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      setSearch((current) => `${current}${event.key}`);
      setActiveIndex(0);
      return;
    }

    if (filteredBoards.length === 0) return;

    if (event.key === "Enter") {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-board-switcher-option]")) return;
      event.preventDefault();
      optionRefs.current[activeIndex]?.click();
      return;
    }

    let nextIndex = activeIndex;
    if (event.key === "ArrowRight") {
      nextIndex = (activeIndex + 1) % filteredBoards.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (activeIndex - 1 + filteredBoards.length) % filteredBoards.length;
    } else if (event.key === "ArrowDown") {
      const nextRowIndex = activeIndex + columnCount;
      nextIndex = nextRowIndex;
      if (nextRowIndex >= filteredBoards.length) nextIndex = activeIndex % columnCount;
    } else if (event.key === "ArrowUp") {
      const previousRowIndex = activeIndex - columnCount;
      if (previousRowIndex >= 0) {
        nextIndex = previousRowIndex;
      } else {
        const lastRowStart = Math.floor((filteredBoards.length - 1) / columnCount) * columnCount;
        const lastIndexInColumn = lastRowStart + activeIndex;
        nextIndex = lastIndexInColumn;
        if (lastIndexInColumn >= filteredBoards.length) nextIndex -= columnCount;
      }
    } else {
      return;
    }

    event.preventDefault();
    setActiveIndex(nextIndex);
    requestAnimationFrame(() => optionRefs.current[nextIndex]?.focus({ preventScroll: true }));
  };

  const results = getBoardSwitcherResults({
    availableBoardCount: availableBoards.length,
    filteredBoards,
    isError,
    isPending,
    search,
    t,
    activeIndex,
    closeSwitcher,
    setActiveIndex,
    optionRefs,
    columnCount,
  });

  return (
    <>
      {children({ open: openSwitcher, preload: preloadBoards, hotkey: boardSwitcherHotkey })}

      <Modal
        opened={isOpen}
        onClose={closeSwitcher}
        title={
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon variant="light" radius="md">
              <IconReplace size={18} stroke={1.5} />
            </ThemeIcon>
            <Text fw={700}>{t("title")}</Text>
          </Group>
        }
        size={1280}
        yOffset={32}
        overlayProps={{ backgroundOpacity: 0.18, blur: 2 }}
        transitionProps={{ transition: "fade", duration: 100, timingFunction: "ease" }}
      >
        <Stack
          data-autofocus
          tabIndex={-1}
          gap="md"
          onKeyDown={handleModalKeyDown}
          className={classes.content}
          aria-describedby="board-switcher-instructions"
        >
          <VisuallyHidden id="board-switcher-instructions">{t("keyboard.instructions")}</VisuallyHidden>
          <ScrollArea.Autosize mah={640} type="auto" offsetScrollbars>
            {results}
          </ScrollArea.Autosize>

          <Group justify={currentBoard ? "space-between" : "flex-end"} gap="xs" visibleFrom="sm">
            {currentBoard && (
              <Text size="xs" c="dimmed">
                {t("currentHidden", { name: currentBoard.name })}
              </Text>
            )}
            <Group gap="xs">
              <Kbd size="xs">
                <IconArrowRight size={12} />
              </Kbd>
              <Kbd size="xs">
                <IconArrowDown size={12} />
              </Kbd>
              <Text size="xs" c="dimmed">
                {t("keyboard.navigate")}
              </Text>
              <Kbd size="xs">Enter</Kbd>
              <Text size="xs" c="dimmed">
                {t("keyboard.open")}
              </Text>
            </Group>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};

interface BoardSwitcherResultsProps {
  availableBoardCount: number;
  filteredBoards: RouterOutputs["board"]["getManageOverview"];
  isError: boolean;
  isPending: boolean;
  search: string;
  t: ReturnType<typeof useI18n<"board.action.switcher">>;
  activeIndex: number;
  closeSwitcher: () => void;
  setActiveIndex: (index: number) => void;
  optionRefs: RefObject<Array<HTMLAnchorElement | null>>;
  columnCount: number;
}

const getBoardSwitcherResults = ({
  availableBoardCount,
  filteredBoards,
  isError,
  isPending,
  search,
  t,
  activeIndex,
  closeSwitcher,
  setActiveIndex,
  optionRefs,
  columnCount,
}: BoardSwitcherResultsProps) => {
  if (isPending) {
    return (
      <Center py="xl">
        <Loader size="sm" />
      </Center>
    );
  }

  if (isError) {
    return (
      <Center py="xl">
        <Text c="dimmed" size="sm">
          {t("error")}
        </Text>
      </Center>
    );
  }

  if (availableBoardCount === 0) {
    return (
      <Center py="xl">
        <Stack align="center" gap={4}>
          <ThemeIcon variant="light" color="gray" size="xl" radius="xl">
            <IconLayoutBoard stroke={1.5} />
          </ThemeIcon>
          <Text fw={600}>{t("empty.title")}</Text>
          <Text c="dimmed" size="sm" ta="center">
            {t("empty.description")}
          </Text>
        </Stack>
      </Center>
    );
  }

  if (filteredBoards.length === 0) {
    return (
      <Center py="xl">
        <Text c="dimmed" size="sm">
          {t("search.empty", { search })}
        </Text>
      </Center>
    );
  }

  return (
    <SimpleGrid id="board-switcher-results" aria-label={t("results")} cols={columnCount} spacing="md" p={4}>
      {filteredBoards.map((board, index) => (
        <UnstyledButton
          key={board.id}
          ref={(node) => {
            optionRefs.current[index] = node;
          }}
          className={classes.option}
          w="100%"
          maw={320}
          mx="auto"
          component={Link}
          href={`/boards/${encodeURIComponent(board.name)}`}
          data-active={index === activeIndex}
          data-board-switcher-option
          onClick={closeSwitcher}
          onFocus={() => setActiveIndex(index)}
          onPointerEnter={() => setActiveIndex(index)}
        >
          <Card padding={0} withBorder radius="md" className={classes.card}>
            <Card.Section>
              <BoardLayoutThumbnail
                preview={board.preview}
                label={t("preview", { name: board.name, count: String(board.preview?.items.length ?? 0) })}
              />
            </Card.Section>
            <Card.Section withBorder p="sm">
              <Group gap="sm" wrap="nowrap">
                <ThemeIcon variant="light" radius="md" size="md">
                  <IconLayoutBoard size={16} stroke={1.5} />
                </ThemeIcon>
                <Text fw={650} truncate>
                  {board.name}
                </Text>
              </Group>
            </Card.Section>
          </Card>
        </UnstyledButton>
      ))}
    </SimpleGrid>
  );
};
