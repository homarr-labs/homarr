import { Alert, Avatar, Button, Group, List, LoadingOverlay, Modal, Stack, Text, TextInput } from "@mantine/core";

import type { DockerAddAppsViewProps } from "./contracts";

export function DockerAddAppsView(props: DockerAddAppsViewProps) {
  return (
    <Modal
      opened={props.opened}
      onClose={() => {
        if (!props.pending) props.onClose();
      }}
      title={props.title}
      size="lg"
      closeOnClickOutside={!props.pending}
      closeOnEscape={!props.pending}
      withCloseButton={!props.pending}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!props.pending && !props.unavailableReason) props.onSubmit?.();
        }}
        style={{ position: "relative" }}
      >
        <LoadingOverlay visible={props.pending} />
        <Stack>
          {props.unavailableReason && <Alert color="yellow">{props.unavailableReason}</Alert>}
          {props.feedback}
          <List spacing="xs">
            {props.containers.map((container, index) => (
              <List.Item
                styles={{ itemWrapper: { width: "100%" }, itemLabel: { flex: 1 } }}
                icon={
                  <Avatar
                    variant="outline"
                    radius={container.iconUrl ? "sm" : "md"}
                    size={30}
                    styles={{ image: { objectFit: "contain" } }}
                    src={container.iconUrl}
                  >
                    {container.name.at(0)?.toUpperCase()}
                  </Avatar>
                }
                key={container.resourceId}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Text lineClamp={1}>{container.name}</Text>
                  <TextInput
                    aria-label={`${container.name} URL`}
                    value={props.urls[index] ?? ""}
                    error={props.errors[index]}
                    disabled={props.pending}
                    onChange={(event) => props.onUrlChange(index, event.currentTarget.value)}
                  />
                </Group>
              </List.Item>
            ))}
          </List>
          <Group justify="end">
            <Button onClick={props.onClose} variant="light" px="xl" disabled={props.pending}>
              {props.cancelLabel}
            </Button>
            <Button
              type="submit"
              px="xl"
              loading={props.pending}
              disabled={!props.onSubmit || Boolean(props.unavailableReason) || !props.containers.length}
            >
              {props.addLabel}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
