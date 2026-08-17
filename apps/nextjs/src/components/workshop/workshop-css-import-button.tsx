"use client";

import { useState } from "react";
import { ActionIcon, Button, Group, Loader, Modal, Pagination, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { IconDownload, IconExternalLink, IconSearch } from "@tabler/icons-react";

import { modalSizeSelect, useConfirmModal } from "@homarr/modals";
import { showErrorNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import { useWorkshopQuery } from "@homarr/workshop/backend";
import type { WorkshopSubmissionSummary } from "@homarr/workshop/schema";
import { validateWorkshopContent } from "@homarr/workshop/schema";

import { NoResults } from "~/components/no-results";
import { getWorkshopWebUrl } from "./workshop-client";
import { useWorkshopSession } from "./workshop-session";
import { WorkshopSubmissionGrid } from "./workshop-submission-grid";
import { WorkshopVoteControl } from "./workshop-vote-control";

/**
 * Picks a community CSS theme in a single surface: browse, confirm, done.
 * The imported rules land in the editor below and are only persisted when the
 * board settings themselves are saved, so there is nothing to preview twice.
 */
export function WorkshopCssImportButton({ onImport }: { onImport(css: string): void }) {
  const t = useScopedI18n("workshop");
  const [opened, controls] = useDisclosure(false);

  return (
    <>
      <Button type="button" variant="light" leftSection={<IconDownload size={16} />} onClick={controls.open}>
        {t("importCss")}
      </Button>
      <Modal opened={opened} onClose={controls.close} title={t("importCss")} size={modalSizeSelect} radius="md">
        <WorkshopCssPicker
          onImport={(css) => {
            onImport(css);
            controls.close();
          }}
        />
      </Modal>
    </>
  );
}

function WorkshopCssPicker({ onImport }: { onImport(css: string): void }) {
  const t = useScopedI18n("workshop");
  const session = useWorkshopSession();
  const { openConfirmModal } = useConfirmModal();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 250);
  const [page, setPage] = useState(1);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const query = useWorkshopQuery(session.client, {
    page,
    perPage: 8,
    type: "customCss",
    sort: "top",
    search: debouncedSearch,
  });
  const totalPages = query.data?.totalPages ?? 1;

  const useTheme = async (item: WorkshopSubmissionSummary) => {
    setPendingId(item.id);
    try {
      const submission = await session.client.get(item.id);
      const validation = validateWorkshopContent("customCss", submission.content);
      if (!validation.success) throw new Error(validation.error);
      const css = validation.data;
      if (typeof css !== "string") throw new Error(t("loadError"));
      openConfirmModal({
        title: t("importCss"),
        children: t("importCssConfirm", { title: item.title }),
        onConfirm: () => onImport(css),
      });
    } catch (cause) {
      showErrorNotification({
        title: t("importCss"),
        message: cause instanceof Error ? cause.message : t("loadError"),
      });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        {t("securityNoticeCss")}
      </Text>
      <TextInput
        aria-label={t("searchCss")}
        placeholder={`${t("searchCss")}...`}
        leftSection={<IconSearch size={16} />}
        rightSection={query.isFetching ? <Loader size={16} /> : undefined}
        value={search}
        onChange={(event) => {
          setSearch(event.currentTarget.value);
          setPage(1);
        }}
      />
      <WorkshopSubmissionGrid
        client={session.client}
        query={query}
        ariaLabel={t("listAriaLabelCss")}
        cols={{ base: 1, sm: 2 }}
        emptyState={<NoResults icon={IconSearch} title={t("emptyCss")} />}
        renderActions={(item) => (
          <>
            <WorkshopVoteControl
              client={session.client}
              submissionId={item.id}
              score={item.score}
              canVote={session.user !== null}
              size="sm"
            />
            <Group gap={4} wrap="nowrap">
              <Tooltip label={t("openCommunity")}>
                <ActionIcon
                  component="a"
                  href={getWorkshopWebUrl(item.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="subtle"
                  color="gray"
                  size="lg"
                  aria-label={t("openOnWorkshop", { title: item.title })}
                >
                  <IconExternalLink size={16} stroke={1.5} />
                </ActionIcon>
              </Tooltip>
              <Button size="sm" loading={pendingId === item.id} onClick={() => void useTheme(item)}>
                {t("useCss")}
              </Button>
            </Group>
          </>
        )}
      />
      {totalPages > 1 && <Pagination total={totalPages} value={page} onChange={setPage} mx="auto" />}
    </Stack>
  );
}
