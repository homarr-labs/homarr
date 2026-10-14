import { ActionIcon, Button, Group, Menu, Modal, Stack, Text } from "@mantine/core";
import {
  IconCategoryPlus,
  IconDots,
  IconFileText,
  IconPlayerPlay,
  IconPlayerStop,
  IconRotateClockwise,
  IconTrash,
} from "@tabler/icons-react";

import type { DockerActionViewProps, DockerViewContainer } from "./contracts";

const containerActions = [
  { action: "start", icon: IconPlayerPlay, color: "green" },
  { action: "stop", icon: IconPlayerStop, color: "red" },
  { action: "restart", icon: IconRotateClockwise, color: "orange" },
  { action: "remove", icon: IconTrash, color: "red" },
] as const;

export function DockerActionBarView<Container extends DockerViewContainer>(props: DockerActionViewProps<Container>) {
  return (
    <Group gap="xs">
      {containerActions.map(({ action, icon: Icon, color }) => (
        <Button
          key={action}
          leftSection={<Icon />}
          color={color}
          loading={props.pending}
          disabled={!props.onAction || props.pending || !props.canRun(action, props.containers)}
          variant="light"
          onClick={() => props.onAction?.(action, props.containers)}
        >
          {props.labels[action]}
        </Button>
      ))}
      <Button
        leftSection={<IconCategoryPlus />}
        color="red"
        disabled={!props.onAddApps || props.pending || !props.containers.length}
        onClick={() => props.onAddApps?.(props.containers)}
        variant="light"
      >
        {props.labels.addApps}
      </Button>
    </Group>
  );
}

export function DockerContainerMenuView<Container extends DockerViewContainer>(
  props: DockerActionViewProps<Container> & { container: Container; onLogs?: (container: Container) => void },
) {
  return (
    <Menu withinPortal position="bottom-end" shadow="sm">
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label={`${props.labels.title}: ${props.container.name}`}
          onClick={(event) => event.stopPropagation()}
        >
          <IconDots size="1rem" />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconFileText size="1rem" />}
          disabled={!props.onLogs || props.pending}
          onClick={() => props.onLogs?.(props.container)}
        >
          {props.labels.logs}
        </Menu.Item>
        <Menu.Divider />
        {containerActions.map(({ action, icon: Icon, color }) => (
          <Menu.Item
            key={action}
            leftSection={<Icon size="1rem" />}
            color={color}
            disabled={!props.onAction || props.pending || !props.canRun(action, [props.container])}
            onClick={() => props.onAction?.(action, [props.container])}
          >
            {props.labels[action]}
          </Menu.Item>
        ))}
        <Menu.Divider />
        <Menu.Item
          leftSection={<IconCategoryPlus size="1rem" />}
          color="red"
          disabled={!props.onAddApps || props.pending}
          onClick={() => props.onAddApps?.([props.container])}
        >
          {props.labels.addApps}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

export interface DockerRemovalConfirmationViewProps {
  opened: boolean;
  title: string;
  message: string;
  pending: boolean;
  allowed: boolean;
  cancelLabel: string;
  removeLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function DockerRemovalConfirmationView(props: DockerRemovalConfirmationViewProps) {
  return (
    <Modal
      opened={props.opened}
      onClose={() => {
        if (!props.pending) props.onClose();
      }}
      closeOnClickOutside={!props.pending}
      closeOnEscape={!props.pending}
      withCloseButton={!props.pending}
      title={props.title}
    >
      <Stack>
        <Text>{props.message}</Text>
        <Group justify="flex-end">
          <Button variant="default" data-autofocus disabled={props.pending} onClick={props.onClose}>
            {props.cancelLabel}
          </Button>
          <Button color="red.9" loading={props.pending} disabled={!props.allowed} onClick={props.onConfirm}>
            {props.removeLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
