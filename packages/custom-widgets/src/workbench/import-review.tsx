import type { ReactNode } from "react";
import { Alert, Badge, Button, Code, Group, Modal, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import type { ModalProps } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import type { ImportReview } from "../core/import";

export interface ImportReviewMessages {
  title: string;
  description: string;
  name: string;
  origin: string;
  authentication: string;
  networkScope: string;
  methods: string;
  permissions: string;
  actionWarningTitle: string;
  actionWarningDescription: string;
  cancel: string;
  confirm: string;
  permission(permission: string): string;
}

export interface ImportReviewDialogProps {
  opened: boolean;
  review: ImportReview | null;
  pending: boolean;
  confirmDisabled?: boolean;
  messages: ImportReviewMessages;
  children?: ReactNode;
  stackId?: string;
  zIndex?: ModalProps["zIndex"];
  onClose(): void;
  onConfirm(): void;
}

function ImportFact({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="xs">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Code>{value || "—"}</Code>
    </Paper>
  );
}

export function ImportReviewDialog({
  opened,
  review,
  pending,
  confirmDisabled,
  messages,
  children,
  stackId,
  zIndex,
  onClose,
  onConfirm,
}: ImportReviewDialogProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={messages.title}
      centered
      size="lg"
      stackId={stackId}
      zIndex={zIndex}
    >
      {review && (
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {messages.description}
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
            <ImportFact label={messages.name} value={review.name} />
            <ImportFact label={messages.origin} value={review.origins.join(", ")} />
            <ImportFact label={messages.authentication} value={review.authTypes.join(", ")} />
            <ImportFact label={messages.networkScope} value={review.networkScopes.join(", ")} />
          </SimpleGrid>
          <div>
            <Text size="sm" fw={600} mb={6}>
              {messages.methods}
            </Text>
            <Group gap={6}>
              {review.methods.map((method) => (
                <Badge
                  key={method}
                  color={method === "DELETE" ? "red" : method === "GET" ? "blue" : "orange"}
                  variant="light"
                >
                  {method}
                </Badge>
              ))}
            </Group>
          </div>
          <div>
            <Text size="sm" fw={600} mb={6}>
              {messages.permissions}
            </Text>
            <Group gap={6}>
              {review.permissions.map((permission) => (
                <Badge key={permission} color="gray" variant="light">
                  {messages.permission(permission)}
                </Badge>
              ))}
            </Group>
          </div>
          {review.hasActions && (
            <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
              <Text size="sm" fw={600}>
                {messages.actionWarningTitle}
              </Text>
              <Text size="sm">{messages.actionWarningDescription}</Text>
            </Alert>
          )}
          {children}
          <Group justify="flex-end">
            <Button type="button" variant="default" onClick={onClose} disabled={pending}>
              {messages.cancel}
            </Button>
            <Button type="button" onClick={onConfirm} loading={pending} disabled={confirmDisabled}>
              {messages.confirm}
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
