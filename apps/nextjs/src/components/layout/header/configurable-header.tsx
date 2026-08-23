"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  AppShellHeader,
  Avatar,
  Group,
  Indicator,
  Loader,
  Tooltip,
  UnstyledButton,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconBrandDocker,
  IconHome,
  IconLayoutDashboard,
  IconReplace,
  IconRobot,
  IconSettings,
  IconSunMoon,
} from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { invariantTechnicalLabels } from "@homarr/definitions";
import { useModalAction } from "@homarr/modals";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import type { HeaderItem } from "@homarr/validation/user";
import { getHeaderItemKey, getHeaderItems } from "@homarr/validation/user";

import { useOptionalHomarrAssistant } from "~/components/assistant/assistant-context";
import { BoardSwitcher } from "~/components/board/board-switcher";
import type { BoardSwitcherControls } from "~/components/board/board-switcher";
import { ClientBurger } from "./burger";
import { HeaderButton } from "./button";
import { DockerQuickAccessModal } from "./docker-quick-access-modal";
import { LazySpotlight } from "./lazy-spotlight";
import { DesktopSearchInput, MobileSearchButton } from "./search";
import { TourTarget } from "./tour-target";
import { UserButtonClient } from "./user-client";
import classes from "./configurable-header.module.css";

interface ConfigurableHeaderProps {
  logo: ReactNode;
  actions?: ReactNode;
  boardEditAction?: ReactNode;
  boardSettingsAction?: ReactNode;
  hasNavigation: boolean;
  avatar: ReactNode;
  userId: string | null;
  isAdmin: boolean;
  isDockerEnabled: boolean;
}

type HeaderBoard = RouterOutputs["board"]["getAllBoards"][number];
export const ConfigurableHeader = ({
  logo,
  actions,
  boardEditAction,
  boardSettingsAction,
  hasNavigation,
  avatar,
  userId,
  isAdmin,
  isDockerEnabled,
}: ConfigurableHeaderProps) => {
  const { headerPreferences } = useSettings();
  const assistant = useOptionalHomarrAssistant();
  const { toggleColorScheme } = useMantineColorScheme();
  const { openModal: openDockerModal } = useModalAction(DockerQuickAccessModal);
  const t = useI18n("management.page.user.setting.general.header");
  const allHeaderItems = getHeaderItems(headerPreferences.zones);
  const hasBoardShortcuts = allHeaderItems.some((item) => item.type === "board");
  const { data: boards = [] } = clientApi.board.getAllBoards.useQuery(undefined, {
    enabled: hasBoardShortcuts,
    staleTime: 60_000,
  });
  const boardsById = useMemo(() => new Map(boards.map((board) => [board.id, board])), [boards]);

  return (
    <BoardSwitcher>
      {(boardSwitcher) => {
        const renderItems = (items: HeaderItem[]) =>
          items.map((item) => (
            <HeaderItem
              key={getHeaderItemKey(item)}
              item={item}
              logo={logo}
              boardEditAction={boardEditAction}
              boardSettingsAction={boardSettingsAction}
              avatar={avatar}
              userId={userId}
              isAdmin={isAdmin}
              isDockerEnabled={isDockerEnabled}
              board={item.type === "board" ? boardsById.get(item.boardId) : undefined}
              searchDisplay={headerPreferences.searchDisplay}
              boardSwitcher={boardSwitcher}
              assistant={assistant}
              openDockerModal={openDockerModal}
              toggleColorScheme={toggleColorScheme}
              label={(key) => t(`items.${key}` as never)}
              boardUnavailableLabel={t("items.boardUnavailable")}
            />
          ));

        return (
          <>
            {headerPreferences.visible ? (
              <AppShellHeader
                maw="100vw"
                zIndex="var(--homarr-z-index-board-header)"
                className={classes.header}
                data-advanced-focus-background
                data-app-shell-header
              >
                <div className={classes.content}>
                  <div className={classes.zone} data-zone="left">
                    {hasNavigation ? <ClientBurger /> : null}
                    {renderItems(headerPreferences.zones.left)}
                  </div>
                  <div className={classes.zone} data-zone="center">
                    {renderItems(headerPreferences.zones.center)}
                  </div>
                  <div className={classes.zone} data-zone="right">
                    {renderItems(headerPreferences.zones.right)}
                    {actions ? <Group className={classes.contextActions}>{actions}</Group> : null}
                  </div>
                </div>
              </AppShellHeader>
            ) : (
              <Group className={classes.floatingControls} gap={4} wrap="nowrap">
                {hasNavigation ? <ClientBurger /> : null}
                <UserButtonClient
                  avatar={avatar}
                  isAdmin={isAdmin}
                  isDockerEnabled={isDockerEnabled}
                  boardSwitcher={boardSwitcher}
                />
              </Group>
            )}
            <LazySpotlight />
          </>
        );
      }}
    </BoardSwitcher>
  );
};

interface HeaderItemProps {
  item: HeaderItem;
  logo: ReactNode;
  boardEditAction: ReactNode;
  boardSettingsAction: ReactNode;
  avatar: ReactNode;
  userId: string | null;
  isAdmin: boolean;
  isDockerEnabled: boolean;
  board: HeaderBoard | undefined;
  searchDisplay: "input" | "icon";
  boardSwitcher: BoardSwitcherControls;
  assistant: ReturnType<typeof useOptionalHomarrAssistant>;
  openDockerModal: () => void;
  toggleColorScheme: () => void;
  label: (key: string) => string;
  boardUnavailableLabel: string;
}

const HeaderItem = ({
  item,
  logo,
  boardEditAction,
  boardSettingsAction,
  avatar,
  userId,
  isAdmin,
  isDockerEnabled,
  board,
  searchDisplay,
  boardSwitcher,
  assistant,
  openDockerModal,
  toggleColorScheme,
  label,
  boardUnavailableLabel,
}: HeaderItemProps) => {
  if (item.type === "board") {
    if (!board) {
      return (
        <Tooltip label={boardUnavailableLabel}>
          <HeaderButton aria-label={boardUnavailableLabel} disabled>
            <IconLayoutDashboard size={20} stroke={1.5} />
          </HeaderButton>
        </Tooltip>
      );
    }
    return (
      <Tooltip label={board.name}>
        <HeaderButton href={`/boards/${encodeURIComponent(board.name)}`} aria-label={board.name}>
          <Avatar src={board.logoImageUrl} size={22} radius="sm">
            <IconLayoutDashboard size={17} stroke={1.5} />
          </Avatar>
        </HeaderButton>
      </Tooltip>
    );
  }

  if (item.id === "logo") {
    return (
      <UnstyledButton component={Link} href="/" className={classes.logo} aria-label={label("logo")}>
        {logo}
      </UnstyledButton>
    );
  }

  if (item.id === "boardEdit") return boardEditAction;
  if (item.id === "boardSettings") return boardSettingsAction;

  if (item.id === "search") {
    return (
      <TourTarget id="board-search">
        <div className={classes.search} data-display={searchDisplay}>
          {searchDisplay === "input" ? (
            <>
              <DesktopSearchInput />
              <MobileSearchButton />
            </>
          ) : (
            <MobileSearchButton alwaysVisible />
          )}
        </div>
      </TourTarget>
    );
  }

  if (item.id === "home") {
    return (
      <Tooltip label={label("home")}>
        <HeaderButton href="/boards" aria-label={label("home")}>
          <IconHome size={20} stroke={1.5} />
        </HeaderButton>
      </Tooltip>
    );
  }

  if (item.id === "boardSwitcher") {
    return (
      <Tooltip label={label("boardSwitcher")}>
        <HeaderButton
          aria-label={label("boardSwitcher")}
          onClick={boardSwitcher.open}
          onFocus={boardSwitcher.preload}
          onPointerEnter={boardSwitcher.preload}
        >
          <IconReplace size={20} stroke={1.5} />
        </HeaderButton>
      </Tooltip>
    );
  }

  if (item.id === "assistant") {
    if (!assistant?.enabled) return null;
    return (
      <Tooltip label={label("assistant")}>
        <Indicator
          inline
          disabled={!assistant.isRunning && assistant.unreadCount === 0}
          color="red"
          size={16}
          label={assistant.isRunning ? <Loader type="bars" color="white" size={8} /> : assistant.unreadCount}
        >
          <HeaderButton aria-label={label("assistant")} onClick={assistant.open}>
            <IconRobot size={20} stroke={1.5} />
          </HeaderButton>
        </Indicator>
      </Tooltip>
    );
  }

  if (item.id === "docker") {
    if (!isDockerEnabled) return null;
    return (
      <Tooltip label={invariantTechnicalLabels.docker}>
        <HeaderButton aria-label={invariantTechnicalLabels.docker} onClick={openDockerModal}>
          <IconBrandDocker size={20} stroke={1.5} />
        </HeaderButton>
      </Tooltip>
    );
  }

  if (item.id === "settings") {
    const href = userId ? `/manage/users/${userId}/general` : "/auth/login";
    return (
      <Tooltip label={label("settings")}>
        <HeaderButton href={href} aria-label={label("settings")}>
          <IconSettings size={20} stroke={1.5} />
        </HeaderButton>
      </Tooltip>
    );
  }

  if (item.id === "themeToggle") {
    return (
      <Tooltip label={label("themeToggle")}>
        <HeaderButton aria-label={label("themeToggle")} onClick={toggleColorScheme}>
          <IconSunMoon size={20} stroke={1.5} />
        </HeaderButton>
      </Tooltip>
    );
  }

  return (
    <TourTarget id="board-user-menu">
      <UserButtonClient
        avatar={avatar}
        isAdmin={isAdmin}
        isDockerEnabled={isDockerEnabled}
        boardSwitcher={boardSwitcher}
      />
    </TourTarget>
  );
};
