"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShellHeader, Avatar, Group, Indicator, Loader, Tooltip, useMantineColorScheme } from "@mantine/core";
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
import type { HeaderItem } from "@homarr/validation/user";
import { getHeaderItemKey, getHeaderItems } from "@homarr/validation/user";

import { useOptionalHomarrAssistant } from "~/components/assistant/assistant-context";
import { BoardSwitcher } from "~/components/board/board-switcher";
import type { BoardSwitcherControls } from "~/components/board/board-switcher";
import { ClientBurger } from "./burger";
import { HeaderButton } from "./button";
import { DockerQuickAccessModal } from "./docker-quick-access-modal";
import { HeaderLogo } from "./header-logo";
import { LazySpotlight } from "./lazy-spotlight";
import { DesktopSearchInput, MobileSearchButton } from "./search";
import { TourTarget } from "./tour-target";
import { UserButtonClient } from "./user-client";
import classes from "./configurable-header.module.css";

interface ConfigurableHeaderProps {
  logo: ReactNode;
  logoWithTitle: ReactNode;
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

const floatingControlsIntroDurationMs = 5_000;
const floatingControlsDismissDelayMs = 900;

export const ConfigurableHeader = ({
  logo,
  logoWithTitle,
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
              logoWithTitle={logoWithTitle}
              boardEditAction={boardEditAction}
              boardSettingsAction={boardSettingsAction}
              avatar={avatar}
              userId={userId}
              isAdmin={isAdmin}
              isDockerEnabled={isDockerEnabled}
              board={item.type === "board" ? boardsById.get(item.boardId) : undefined}
              searchDisplay={headerPreferences.searchDisplay}
              logoDisplay={headerPreferences.logoDisplay}
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
            <AppShellHeader
              maw="100vw"
              zIndex="var(--homarr-z-index-board-header)"
              className={classes.header}
              data-desktop-visible={headerPreferences.visible}
              data-advanced-focus-background
              data-app-shell-header
            >
              <div className={classes.desktopContent}>
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
              </div>
              <div className={classes.mobileContent}>
                <Group className={classes.mobileIdentity} gap="xs" wrap="nowrap">
                  {hasNavigation ? <ClientBurger /> : null}
                  <HeaderLogo display="logo" logo={logo} logoWithTitle={logoWithTitle} label={t("items.logo")} />
                </Group>
                <Group className={classes.mobileActions} gap="xs" wrap="nowrap">
                  {actions}
                  {boardEditAction}
                  {boardSettingsAction}
                  <TourTarget id="board-search">
                    <MobileSearchButton alwaysVisible />
                  </TourTarget>
                  <TourTarget id="board-user-menu">
                    <UserButtonClient
                      avatar={avatar}
                      isAdmin={isAdmin}
                      isDockerEnabled={isDockerEnabled}
                      boardSwitcher={boardSwitcher}
                    />
                  </TourTarget>
                </Group>
              </div>
            </AppShellHeader>
            {!headerPreferences.visible ? (
              <FloatingHeaderControls>
                {hasNavigation ? <ClientBurger /> : null}
                <UserButtonClient
                  avatar={avatar}
                  isAdmin={isAdmin}
                  isDockerEnabled={isDockerEnabled}
                  boardSwitcher={boardSwitcher}
                />
              </FloatingHeaderControls>
            ) : null}
            <LazySpotlight />
          </>
        );
      }}
    </BoardSwitcher>
  );
};

const FloatingHeaderControls = ({ children }: { children: ReactNode }) => {
  const [isIntroComplete, setIsIntroComplete] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const isInteractingRef = useRef(false);
  const dismissTimeoutRef = useRef<number | null>(null);

  const clearDismissTimeout = () => {
    if (dismissTimeoutRef.current === null) return;
    window.clearTimeout(dismissTimeoutRef.current);
    dismissTimeoutRef.current = null;
  };

  const dismissSoon = () => {
    if (!isIntroComplete) return;
    clearDismissTimeout();
    dismissTimeoutRef.current = window.setTimeout(() => {
      if (!isInteractingRef.current) setIsVisible(false);
    }, floatingControlsDismissDelayMs);
  };

  const revealFromCorner = () => {
    if (!isIntroComplete) return;
    clearDismissTimeout();
    setIsVisible(true);
  };

  const startInteraction = () => {
    isInteractingRef.current = true;
    clearDismissTimeout();
    setIsVisible(true);
  };

  const endInteraction = () => {
    isInteractingRef.current = false;
    dismissSoon();
  };

  useEffect(() => {
    const introTimeout = window.setTimeout(() => {
      setIsIntroComplete(true);
      if (!isInteractingRef.current) setIsVisible(false);
    }, floatingControlsIntroDurationMs);

    return () => {
      window.clearTimeout(introTimeout);
      if (dismissTimeoutRef.current !== null) window.clearTimeout(dismissTimeoutRef.current);
    };
  }, []);

  return (
    <>
      <div
        className={classes.floatingControlsCorner}
        data-active={isIntroComplete || undefined}
        aria-hidden
        onPointerEnter={revealFromCorner}
        onPointerMove={revealFromCorner}
        onPointerDown={revealFromCorner}
        onPointerLeave={dismissSoon}
      />
      <Group
        className={classes.floatingControls}
        data-visible={isVisible || undefined}
        gap={4}
        wrap="nowrap"
        onPointerEnter={startInteraction}
        onPointerLeave={endInteraction}
        onFocusCapture={startInteraction}
        onBlurCapture={(event) => {
          if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
          endInteraction();
        }}
      >
        {children}
      </Group>
    </>
  );
};

interface HeaderItemProps {
  item: HeaderItem;
  logo: ReactNode;
  logoWithTitle: ReactNode;
  boardEditAction: ReactNode;
  boardSettingsAction: ReactNode;
  avatar: ReactNode;
  userId: string | null;
  isAdmin: boolean;
  isDockerEnabled: boolean;
  board: HeaderBoard | undefined;
  searchDisplay: "input" | "icon";
  logoDisplay: "logo" | "logoAndText";
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
  logoWithTitle,
  boardEditAction,
  boardSettingsAction,
  avatar,
  userId,
  isAdmin,
  isDockerEnabled,
  board,
  searchDisplay,
  logoDisplay,
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
            {getBoardInitial(board.name)}
          </Avatar>
        </HeaderButton>
      </Tooltip>
    );
  }

  if (item.id === "logo") {
    return <HeaderLogo display={logoDisplay} logo={logo} logoWithTitle={logoWithTitle} label={label("logo")} />;
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

const getBoardInitial = (name: string) => Array.from(name.trim())[0]?.toLocaleUpperCase() ?? "?";
