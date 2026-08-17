import type { ReactNode } from "react";
import { Alert, Badge, Box, Button, Code, Group, Modal, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import type { ModalProps } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import type { ImportReview } from "../core/import";

export interface ImportReviewContentMessages {
  description: string;
  name: string;
  origin: string;
  authentication: string;
  networkScope: string;
  methods: string;
  permissions: string;
  actionWarningTitle: string;
  actionWarningDescription: string;
  permission(permission: string): string;
}

export interface ImportReviewMessages extends ImportReviewContentMessages {
  title: string;
  cancel: string;
  confirm: string;
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
  size?: ModalProps["size"];
  styles?: ModalProps["styles"];
  onClose(): void;
  onConfirm(): void;
}

const importReviewModalStyles = {
  content: {
    display: "flex",
    flexDirection: "column" as const,
    maxHeight: "min(85dvh, 900px)",
  },
  body: {
    display: "flex",
    flex: 1,
    flexDirection: "column" as const,
    minHeight: 0,
    overflow: "hidden",
    padding: 0,
  },
};

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

export interface ImportReviewContentProps {
  review: ImportReview;
  messages: ImportReviewContentMessages;
  children?: ReactNode;
}

/**
 * The security facts a user has to review before a custom widget is installed.
 * Shared by the import modal and the Workshop install page so both read identically.
 */
export function ImportReviewContent({ review, messages, children }: ImportReviewContentProps) {
  return (
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
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
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
      </SimpleGrid>
      {review.hasActions && (
        <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
          <Text size="sm" fw={600}>
            {messages.actionWarningTitle}
          </Text>
          <Text size="sm">{messages.actionWarningDescription}</Text>
        </Alert>
      )}
      {children}
    </Stack>
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
  size,
  styles,
  onClose,
  onConfirm,
}: ImportReviewDialogProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={messages.title}
      centered
      stackId={stackId}
      zIndex={zIndex}
      size={size ?? "lg"}
      styles={styles ?? importReviewModalStyles}
    >
      {review && (
        <>
          <Box p="lg" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            <ImportReviewContent review={review} messages={messages}>
              {children}
            </ImportReviewContent>
          </Box>
          <Box
            px="lg"
            py="md"
            bg="var(--mantine-color-body)"
            style={{ borderTop: "1px solid var(--mantine-color-default-border)", flexShrink: 0 }}
          >
            <Group justify="flex-end" gap="sm">
              <Button type="button" variant="default" onClick={onClose} disabled={pending}>
                {messages.cancel}
              </Button>
              <Button type="button" onClick={onConfirm} loading={pending} disabled={confirmDisabled}>
                {messages.confirm}
              </Button>
            </Group>
          </Box>
        </>
      )}
    </Modal>
  );
}
