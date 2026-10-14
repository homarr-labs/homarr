import { useMemo } from "react";
import { Avatar, Indicator, Loader, Tooltip } from "@mantine/core";
import { IconBrandDocker, IconHome, IconReplace, IconRobot, IconSettings, IconSunMoon } from "@tabler/icons-react";

import { ConfigurableHeaderView, HeaderButton, HeaderLogoView } from "@homarr/ui/source-views/chrome";
import { getHeaderItemKey } from "@homarr/validation/header-preferences";
import classes from "@homarr/ui/source-views/chrome/configurable-header.module.css";

import type { ConfigurableHeaderProps, HeaderItemProps } from "./contracts";

export function ConfigurableHeader(props: ConfigurableHeaderProps) {
  const { headerPreferences, boards, hasNavigation, burger, userMenu, spotlight, actions } = props;
  const boardsById = useMemo(() => new Map(boards.map((board) => [board.id, board])), [boards]);

  return (
    <ConfigurableHeaderView
      visible={headerPreferences.visible}
      zones={headerPreferences.zones}
      desktopDisplay={{ search: headerPreferences.searchDisplay, logo: headerPreferences.logoDisplay }}
      getItemKey={getHeaderItemKey}
      renderItem={(item: HeaderItemProps["item"], display: HeaderItemProps["display"]) => (
        <HeaderItem
          {...props}
          item={item}
          display={display}
          board={item.type === "board" ? boardsById.get(item.boardId) : undefined}
        />
      )}
      hasNavigation={hasNavigation}
      burger={burger}
      floatingUser={userMenu}
      spotlight={spotlight}
      actions={actions}
    />
  );
}

export function HeaderItem({
  item,
  display,
  board,
  logo,
  logoWithTitle,
  logoHref,
  boardEditAction,
  boardSettingsAction,
  desktopSearchInput,
  renderMobileSearchButton,
  boardSwitcher,
  assistant,
  docker,
  themeToggle,
  userId,
  userMenu,
  TourTarget,
  label,
  boardUnavailableLabel,
  dockerLabel,
}: HeaderItemProps) {
  if (item.type === "board") {
    if (!board) {
      return (
        <Tooltip label={boardUnavailableLabel}>
          <HeaderButton aria-label={boardUnavailableLabel} disabled>
            <Avatar size={22} radius="sm">
              ?
            </Avatar>
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
    return (
      <HeaderLogoView
        href={logoHref}
        display={display.logo}
        logo={logo}
        logoWithTitle={logoWithTitle}
        label={label("logo")}
      />
    );
  }

  if (item.id === "boardEdit") return boardEditAction;
  if (item.id === "boardSettings") return boardSettingsAction;

  if (item.id === "search") {
    return (
      <TourTarget id="board-search">
        <div className={classes.search} data-display={display.search}>
          {display.search === "input" ? (
            <>
              {desktopSearchInput}
              {renderMobileSearchButton(false)}
            </>
          ) : (
            renderMobileSearchButton(true)
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
    if (boardSwitcher.kind === "unavailable") {
      return (
        <Tooltip label={boardSwitcher.reason}>
          <HeaderButton aria-label={boardSwitcher.reason} disabled>
            <IconReplace size={20} stroke={1.5} />
          </HeaderButton>
        </Tooltip>
      );
    }
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
    if (!docker) return null;
    let tooltip = dockerLabel;
    if (docker.kind === "unavailable") tooltip = docker.reason;
    return (
      <Tooltip label={tooltip}>
        <HeaderButton
          aria-label={dockerLabel}
          disabled={docker.kind === "unavailable"}
          onClick={docker.kind === "available" ? docker.run : undefined}
        >
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
    let tooltip = label("themeToggle");
    if (themeToggle.kind === "unavailable") tooltip = themeToggle.reason;
    return (
      <Tooltip label={tooltip}>
        <HeaderButton
          aria-label={label("themeToggle")}
          disabled={themeToggle.kind === "unavailable"}
          onClick={themeToggle.kind === "available" ? themeToggle.run : undefined}
        >
          <IconSunMoon size={20} stroke={1.5} />
        </HeaderButton>
      </Tooltip>
    );
  }

  return (
    <TourTarget id="board-user-menu">
      <div className={classes.userMenu}>{userMenu}</div>
    </TourTarget>
  );
}

function getBoardInitial(name: string) {
  const firstCharacter = Array.from(name.trim())[0] ?? "?";
  return Array.from(firstCharacter.toUpperCase())[0] ?? "?";
}
