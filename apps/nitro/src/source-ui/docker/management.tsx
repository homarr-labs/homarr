import type { ReactNode } from "react";
import { Alert, Modal, Stack, Title } from "@mantine/core";

export interface DockerManagementViewProps {
  title: string;
  breadcrumb?: ReactNode;
  reconciliation?: ReactNode;
  inventory: ReactNode;
  unavailableReason?: string;
}

export function DockerManagementView(props: DockerManagementViewProps) {
  return (
    <>
      {props.breadcrumb}
      <Stack>
        <Title order={1}>{props.title}</Title>
        {props.unavailableReason && <Alert color="yellow">{props.unavailableReason}</Alert>}
        {props.reconciliation}
        {props.inventory}
      </Stack>
    </>
  );
}

export interface DockerQuickAccessViewProps {
  opened: boolean;
  title: string;
  inventory: ReactNode;
  unavailableReason?: string;
  onClose: () => void;
}

export function DockerQuickAccessView(props: DockerQuickAccessViewProps) {
  return (
    <Modal opened={props.opened} onClose={props.onClose} title={props.title} size={1400}>
      <Stack gap="xs">
        {props.unavailableReason && <Alert color="yellow">{props.unavailableReason}</Alert>}
        {props.inventory}
      </Stack>
    </Modal>
  );
}
