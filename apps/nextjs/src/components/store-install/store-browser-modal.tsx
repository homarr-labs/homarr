"use client";

import { useState } from "react";
import {
  ActionIcon,
  Anchor,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Image,
  Loader,
  Modal,
  Pagination,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { IconChevronLeft, IconChevronRight, IconExternalLink } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import type { StoreSubmission } from "./store-api";
import { fetchStoreSubmissions, getStoreFileUrl } from "./store-api";

const WORKSHOP_URL = process.env.NEXT_PUBLIC_WORKSHOP_URL || "https://homarr.dev/workshop";

interface Props {
  type: "css" | "widget";
  opened: boolean;
  onClose: () => void;
  onSelect: (submission: StoreSubmission) => void;
  actionLabel: string;
  pendingId?: string | null;
}

const displayName = (submission: StoreSubmission) => submission.authorName;

export const StoreBrowserModal = ({ type, opened, onClose, onSelect, actionLabel, pendingId }: Props) => {
  const [page, setPage] = useState(1);
  const handleClose = () => {
    setPage(1);
    onClose();
  };
  const { data, isLoading, error } = useQuery({
    queryKey: ["store-submissions", type, page],
    queryFn: () => fetchStoreSubmissions(type, page),
    enabled: opened,
  });

  const errorText = error instanceof Error ? error.message : "unknown error";

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="sm">
          <Text fw={600}>Install from Workshop</Text>
          <Anchor
            href={WORKSHOP_URL}
            target="_blank"
            rel="noopener noreferrer"
            size="xs"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            Open Workshop <IconExternalLink size={12} />
          </Anchor>
        </Group>
      }
      size={1200}
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <Stack gap="md">
        {isLoading && (
          <Center py="xl">
            <Loader />
          </Center>
        )}

        {error && <Alert color="red">Failed to load the workshop: {errorText}</Alert>}

        {data && data.items.length === 0 && (
          <Text c="dimmed" ta="center" py="xl">
            No submissions available yet.
          </Text>
        )}

        {data && data.items.length > 0 && (
          <>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              {data.items.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  actionLabel={actionLabel}
                  pending={pendingId === submission.id}
                  onSelect={() => onSelect(submission)}
                />
              ))}
            </SimpleGrid>

            {data.totalPages > 1 && (
              <Center>
                <Pagination total={data.totalPages} value={page} onChange={setPage} />
              </Center>
            )}
          </>
        )}
      </Stack>
    </Modal>
  );
};

const SubmissionCard = ({
  submission,
  actionLabel,
  pending,
  onSelect,
}: {
  submission: StoreSubmission;
  actionLabel: string;
  pending: boolean;
  onSelect: () => void;
}) => {
  const screenshots = submission.screenshots ?? [];
  const [imgIdx, setImgIdx] = useState(0);
  const score = submission.upvotes - submission.downvotes;
  const scorePrefix = score > 0 ? "+" : "";

  return (
    <Card withBorder padding={0}>
      {screenshots.length > 0 && (
        <Box pos="relative">
          <Image
            src={screenshots[imgIdx] ? getStoreFileUrl(submission, screenshots[imgIdx]) : undefined}
            alt={submission.title}
            h={180}
            fit="cover"
          />
          {screenshots.length > 1 && (
            <>
              <ActionIcon
                variant="filled"
                color="dark"
                size="xs"
                pos="absolute"
                top="50%"
                left={4}
                style={{ transform: "translateY(-50%)" }}
                onClick={() => setImgIdx((i) => (i - 1 + screenshots.length) % screenshots.length)}
              >
                <IconChevronLeft size={12} />
              </ActionIcon>
              <ActionIcon
                variant="filled"
                color="dark"
                size="xs"
                pos="absolute"
                top="50%"
                right={4}
                style={{ transform: "translateY(-50%)" }}
                onClick={() => setImgIdx((i) => (i + 1) % screenshots.length)}
              >
                <IconChevronRight size={12} />
              </ActionIcon>
            </>
          )}
        </Box>
      )}

      <Stack gap={4} p="sm">
        <Group gap="xs" wrap="nowrap">
          <Box
            w={8}
            h={8}
            style={{ borderRadius: "50%", flexShrink: 0, backgroundColor: submission.type === "css" ? "var(--mantine-color-blue-5)" : "var(--mantine-color-yellow-5)" }}
          />
          <Text fw={600} size="sm" truncate style={{ flex: 1 }}>
            {submission.title}
          </Text>
          <Badge variant="light" size="sm" style={{ flexShrink: 0 }}>
            {scorePrefix}
            {score}
          </Badge>
        </Group>

        <Text size="xs" c="dimmed">
          {displayName(submission)} · v{submission.version}
        </Text>

        {submission.description && (
          <Text size="xs" c="dimmed" lineClamp={2}>
            {submission.description}
          </Text>
        )}

        <Group gap="xs" mt={4}>
          <Button size="xs" style={{ flex: 1 }} loading={pending} onClick={onSelect}>
            {actionLabel}
          </Button>
          <ActionIcon
            variant="light"
            size="sm"
            component="a"
            href={`${WORKSHOP_URL}/${submission.id}/`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View in workshop"
          >
            <IconExternalLink size={14} />
          </ActionIcon>
        </Group>
      </Stack>
    </Card>
  );
};
