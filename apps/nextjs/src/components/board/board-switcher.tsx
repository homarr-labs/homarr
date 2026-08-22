"use client";

import type { KeyboardEvent, ReactNode, RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Card,
  Center,
  Group,
  Loader,
  Modal,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
  useMatches,
  VisuallyHidden,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { IconDeviceMobile, IconHomeFilled, IconLayoutBoard, IconSearch } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useOptionalBoard } from "@homarr/boards/context";
import { useI18n } from "@homarr/translation/client";
import { Link, UserAvatar } from "@homarr/ui";

import { BoardLayoutThumbnail } from "~/components/board/board-layout-thumbnail";

import classes from "./board-switcher.module.css";

export const boardSwitcherHotkey = "shift+c";

interface BoardSwitcherProps {
  children: (controls: { open: () => void; preload: () => void; hotkey: string }) => ReactNode;
}

export const BoardSwitcher = ({ children }: BoardSwitcherProps) => {
  const t = useI18n("board.action.switcher");
  const manageBoardsT = useI18n("management.page.board");
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
  } = clientApi.board.getManageOverview.useQuery(
    { fullPreview: true },
    {
      enabled: isOpen,
    },
  );

  const switcherBoards = useMemo(
    () => [
      ...boards.filter((board) => board.id !== currentBoard?.id),
      ...boards.filter((board) => board.id === currentBoard?.id),
    ],
    [boards, currentBoard?.id],
  );
  const filteredBoards = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    if (normalizedSearch.length === 0) return switcherBoards;
    return switcherBoards.filter((board) => board.name.toLocaleLowerCase().includes(normalizedSearch));
  }, [search, switcherBoards]);
  const columnCount = Math.max(1, Math.min(filteredBoards.length, responsiveColumnCount));
  const modalColumnCount = Math.max(1, Math.min(switcherBoards.length, responsiveColumnCount));

  const openSwitcher = useCallback(() => {
    setIsOpen(true);
  }, []);
  const closeSwitcher = useCallback(() => {
    setIsOpen(false);
    setSearch("");
    setActiveIndex(0);
  }, []);
  const preloadBoards = () => void utils.board.getManageOverview.prefetch({ fullPreview: true });

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
    const isSearchInput =
      event.target instanceof HTMLInputElement && event.target.dataset.boardSwitcherSearch !== undefined;

    if (!isSearchInput && event.key === "Backspace") {
      event.preventDefault();
      setSearch((current) => current.slice(0, -1));
      setActiveIndex(0);
      return;
    }

    if (!isSearchInput && event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
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
    availableBoardCount: switcherBoards.length,
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
    manageBoardsT,
  });

  return (
    <>
      {children({ open: openSwitcher, preload: preloadBoards, hotkey: boardSwitcherHotkey })}

      <Modal
        opened={isOpen}
        onClose={closeSwitcher}
        withCloseButton={false}
        yOffset="15vh"
        aria-label={t("title")}
        size={`${modalColumnCount * 15 + Math.max(0, modalColumnCount - 1) * 0.75}rem`}
        overlayProps={{ backgroundOpacity: 0, blur: 2 }}
        transitionProps={{ transition: "fade", duration: 100, timingFunction: "ease" }}
        classNames={{ content: classes.modalContent, body: classes.modalBody }}
      >
        <Stack
          tabIndex={-1}
          gap="xs"
          onKeyDown={handleModalKeyDown}
          className={classes.content}
          aria-describedby="board-switcher-instructions"
        >
          <VisuallyHidden id="board-switcher-instructions">{t("keyboard.instructions")}</VisuallyHidden>
          <TextInput
            data-autofocus
            data-board-switcher-search
            value={search}
            onChange={(event) => {
              setSearch(event.currentTarget.value);
              setActiveIndex(0);
            }}
            leftSection={<IconSearch size="1rem" stroke={1.6} />}
            placeholder={t("title")}
            aria-label={t("title")}
            aria-controls="board-switcher-results"
            radius="xl"
            classNames={{ input: classes.searchInput }}
          />
          <ScrollArea.Autosize mah="min(80vh, 42rem)" type="never">
            {results}
          </ScrollArea.Autosize>
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
  manageBoardsT: ReturnType<typeof useI18n<"management.page.board">>;
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
  manageBoardsT,
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
    <SimpleGrid id="board-switcher-results" aria-label={t("results")} cols={columnCount} spacing="xs" p={2}>
      {filteredBoards.map((board, index) => (
        <UnstyledButton
          key={board.id}
          ref={(node) => {
            optionRefs.current[index] = node;
          }}
          className={classes.option}
          w="100%"
          maw={240}
          mx="auto"
          component={Link}
          href={`/boards/${encodeURIComponent(board.name)}`}
          data-active={index === activeIndex}
          data-board-switcher-option
          onClick={closeSwitcher}
          onFocus={() => setActiveIndex(index)}
          onPointerEnter={() => setActiveIndex(index)}
        >
          <Card padding={0} withBorder radius="lg" className={classes.card}>
            <Card.Section>
              <BoardLayoutThumbnail
                preview={board.preview}
                label={t("preview", { name: board.name, count: String(board.preview?.items.length ?? 0) })}
                fitFullLayout
              />
            </Card.Section>
            <Card.Section withBorder px="sm" py={6}>
              <Group justify="space-between" gap="xs" wrap="nowrap">
                <Text fw={600} size="sm" truncate>
                  {board.name}
                </Text>
                <Group gap={4} wrap="nowrap">
                  {board.isHome && (
                    <Tooltip label={manageBoardsT("action.setHomeBoard.badge.tooltip")}>
                      <Badge
                        className={classes.metadataBadge}
                        color="yellow"
                        variant="light"
                        aria-label={manageBoardsT("action.setHomeBoard.badge.label")}
                      >
                        <IconHomeFilled size="0.7rem" />
                      </Badge>
                    </Tooltip>
                  )}
                  {board.isMobileHome && (
                    <Tooltip label={manageBoardsT("action.setMobileHomeBoard.badge.tooltip")}>
                      <Badge
                        className={classes.metadataBadge}
                        color="yellow"
                        variant="light"
                        aria-label={manageBoardsT("action.setMobileHomeBoard.badge.label")}
                      >
                        <IconDeviceMobile size="0.7rem" />
                      </Badge>
                    </Tooltip>
                  )}
                  {board.creator && (
                    <Tooltip label={board.creator.name ?? manageBoardsT("preview.unknownCreator")}>
                      <UserAvatar user={board.creator} size="xs" />
                    </Tooltip>
                  )}
                </Group>
              </Group>
            </Card.Section>
          </Card>
        </UnstyledButton>
      ))}
    </SimpleGrid>
  );
};
