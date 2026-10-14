import type { ReactNode } from "react";
import { Badge, Indicator, Kbd, Loader, Menu, Text, UnstyledButton } from "@mantine/core";
import {
  IconBrandDocker,
  IconHome,
  IconLayoutDashboard,
  IconLogin,
  IconLogout,
  IconReplace,
  IconRobot,
  IconSettings,
  IconTool,
} from "@tabler/icons-react";

import type { HeaderAssistant, UserButtonProps } from "./contracts";
import { ChromeLink } from "./navigation";

function formatHotkeyLabel(hotkey: string, modifierLabel: string) {
  return hotkey
    .split("+")
    .map((key) => {
      if (key === "mod") return modifierLabel;
      return `${key.charAt(0).toUpperCase()}${key.slice(1)}`;
    })
    .join(" + ");
}

function AssistantMenuStatus({
  assistant,
  labels,
}: Pick<UserButtonProps, "labels"> & { readonly assistant: HeaderAssistant }) {
  if (assistant.unreadCount > 0) {
    let count: string | number = assistant.unreadCount;
    if (count > 99) count = "99+";
    return (
      <Badge size="sm" variant="filled" color="red" circle>
        {count}
      </Badge>
    );
  }
  if (assistant.isRunning)
    return (
      <Text size="xs" c="dimmed">
        {labels.assistantThinking}
      </Text>
    );
  return <Kbd size="xs">{formatHotkeyLabel(labels.assistantHotkey, labels.modifier)}</Kbd>;
}

export function UserButton({
  avatar,
  updateIndicator: UpdateIndicator,
  updatesMenuItem,
  colorSchemeCombobox,
  languageCombobox,
  boardSettingsHref,
  boardSwitcher,
  assistant,
  docker,
  session,
  signOut,
  labels,
}: UserButtonProps) {
  let indicatorLabel: ReactNode;
  if (assistant?.isRunning) indicatorLabel = <Loader type="bars" color="white" size={10} />;
  else if (assistant?.unreadCount) {
    indicatorLabel = assistant.unreadCount;
    if (assistant.unreadCount > 99) indicatorLabel = "99+";
  }

  return (
    <Menu width={300} withinPortal keepMounted>
      <Menu.Dropdown>
        {updatesMenuItem}
        <Menu.Item component={ChromeLink} href="/boards" leftSection={<IconHome size="1rem" />}>
          {labels.homeBoard}
        </Menu.Item>
        {boardSettingsHref && (
          <Menu.Item component={ChromeLink} href={boardSettingsHref} leftSection={<IconLayoutDashboard size="1rem" />}>
            {labels.boardSettings}
          </Menu.Item>
        )}
        {boardSwitcher.kind === "available" ? (
          <Menu.Item
            leftSection={<IconReplace size="1rem" />}
            rightSection={<Kbd size="xs">{formatHotkeyLabel(boardSwitcher.hotkey, labels.modifier)}</Kbd>}
            onClick={boardSwitcher.open}
            onFocus={boardSwitcher.preload}
            onPointerEnter={boardSwitcher.preload}
          >
            {labels.boardSwitcher}
          </Menu.Item>
        ) : (
          <Menu.Item leftSection={<IconReplace size="1rem" />} disabled title={boardSwitcher.reason}>
            {labels.boardSwitcher}
          </Menu.Item>
        )}
        <Menu.Divider />
        <Menu.Item p={4} closeMenuOnClick={false} component="div">
          {colorSchemeCombobox}
        </Menu.Item>
        <Menu.Item p={4} closeMenuOnClick={false} component="div">
          {languageCombobox}
        </Menu.Item>
        <Menu.Divider />
        {session.status === "authenticated" && (
          <>
            {assistant?.enabled && (
              <Menu.Item
                leftSection={
                  assistant.isRunning ? <Loader type="bars" color="red" size="xs" /> : <IconRobot size="1rem" />
                }
                rightSection={<AssistantMenuStatus assistant={assistant} labels={labels} />}
                onClick={assistant.open}
              >
                {labels.assistant}
              </Menu.Item>
            )}
            <Menu.Item
              component={ChromeLink}
              href={`/manage/users/${session.userId}/general`}
              leftSection={<IconSettings size="1rem" />}
            >
              {labels.preferences}
            </Menu.Item>
            <Menu.Item component={ChromeLink} href="/manage" leftSection={<IconTool size="1rem" />}>
              {labels.management}
            </Menu.Item>
            {docker && (
              <Menu.Item
                leftSection={<IconBrandDocker size="1rem" />}
                disabled={docker.kind === "unavailable"}
                title={docker.kind === "unavailable" ? docker.reason : undefined}
                onClick={docker.kind === "available" ? docker.run : undefined}
              >
                {labels.docker}
              </Menu.Item>
            )}
          </>
        )}
        <Menu.Divider />
        {session.status === "authenticated" && (
          <Menu.Item
            onClick={signOut.kind === "available" ? signOut.run : undefined}
            disabled={signOut.kind === "unavailable"}
            title={signOut.kind === "unavailable" ? signOut.reason : undefined}
            leftSection={<IconLogout size="1rem" />}
            color="red"
          >
            {labels.logout}
          </Menu.Item>
        )}
        {session.status === "unauthenticated" && (
          <Menu.Item component={ChromeLink} href="/auth/login" leftSection={<IconLogin size="1rem" />}>
            {labels.login}
          </Menu.Item>
        )}
        {session.status === "unavailable" && (
          <Menu.Item disabled title={session.reason}>
            {session.reason}
          </Menu.Item>
        )}
      </Menu.Dropdown>
      <Menu.Target>
        <Indicator
          inline
          disabled={!assistant?.isRunning && !assistant?.unreadCount}
          color="red"
          size={20}
          offset={4}
          label={indicatorLabel}
        >
          <UnstyledButton aria-label={labels.open}>
            <UpdateIndicator>{avatar}</UpdateIndicator>
          </UnstyledButton>
        </Indicator>
      </Menu.Target>
    </Menu>
  );
}
