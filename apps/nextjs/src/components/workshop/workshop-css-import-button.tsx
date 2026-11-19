"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ButtonProps } from "@mantine/core";
import { ActionIcon, Button, Group, Loader, Modal, Pagination, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { IconDownload, IconExternalLink, IconSearch } from "@tabler/icons-react";

import { modalSizeSelect, useConfirmModal } from "@homarr/modals";
import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import type { CustomTheme } from "@homarr/validation/theme";
import { useWorkshopQuery } from "@homarr/workshop/backend";
import type { WorkshopSubmissionSummary } from "@homarr/workshop/schema";
import { WORKSHOP_SCHEMA_BY_TYPE, validateWorkshopContent, validateWorkshopTheme } from "@homarr/workshop/schema";

import { NoResults } from "@homarr/ui";
import { getWorkshopWebUrl } from "./workshop-client";
import { useWorkshopSession } from "./workshop-session";
import { WorkshopSubmissionGrid } from "./workshop-submission-grid";
import { WorkshopVoteControl } from "./workshop-vote-control";

const WorkshopCodeViewer = dynamic(() => import("./workshop-code-viewer").then((module) => module.WorkshopCodeViewer));

/**
 * Picks a community CSS theme in a single surface: browse, confirm, done.
 * The imported rules land in the editor below and are only persisted when the
 * settings themselves are saved, so there is nothing to preview twice.
 */
export function WorkshopCssImportButton({
  onImport,
  size,
}: {
  onImport(css: string): void;
  size?: ButtonProps["size"];
}) {
  return <WorkshopAppearanceImportButton type="customCss" size={size} onImport={onImport} />;
}

export function WorkshopThemeImportButton({ onImport }: { onImport(theme: CustomTheme): void }) {
  return <WorkshopAppearanceImportButton type="customTheme" onImport={onImport} />;
}

type AppearanceImport =
  | { type: "customCss"; onImport(css: string): void }
  | { type: "customTheme"; onImport(theme: CustomTheme): void };

function WorkshopAppearanceImportButton(props: AppearanceImport & { size?: ButtonProps["size"] }) {
  const t = useI18n("workshop");
  const [opened, controls] = useDisclosure(false);
  const title = t(props.type === "customTheme" ? "theme.browse" : "importCss");

  return (
    <>
      <Button
        type="button"
        size={props.size}
        variant="light"
        leftSection={<IconDownload size={16} />}
        onClick={controls.open}
      >
        {title}
      </Button>
      <Modal opened={opened} onClose={controls.close} title={title} size={modalSizeSelect} radius="md">
        {opened && <WorkshopAppearancePicker {...props} onClose={controls.close} />}
      </Modal>
    </>
  );
}

function WorkshopAppearancePicker(props: AppearanceImport & { onClose(): void }) {
  const t = useI18n("workshop");
  const session = useWorkshopSession();
  const { openConfirmModal } = useConfirmModal();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 250);
  const [page, setPage] = useState(1);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [review, setReview] = useState<{ item: WorkshopSubmissionSummary; theme: CustomTheme } | null>(null);
  const reviewBack = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const isTheme = props.type === "customTheme";
  const searchLabel = t(isTheme ? "theme.search" : "searchCss");

  const query = useWorkshopQuery(session.client, {
    page,
    perPage: 8,
    type: props.type,
    sort: "top",
    search: debouncedSearch,
  });
  const totalPages = query.data?.totalPages ?? 1;

  useEffect(() => {
    if (review) reviewBack.current?.focus();
  }, [review]);

  const reviewSubmission = async (item: WorkshopSubmissionSummary) => {
    setPendingId(item.id);
    try {
      const submission = await session.client.get(item.id);
      if (submission.type !== props.type || submission.widgetSchema !== WORKSHOP_SCHEMA_BY_TYPE[props.type]) {
        throw new Error(t("loadError"));
      }
      if (props.type === "customTheme") {
        const validation = validateWorkshopTheme(submission.content);
        if (!validation.success) throw new Error(validation.error);
        setReview({ item: submission, theme: validation.data });
        return;
      }
      const validation = validateWorkshopContent("customCss", submission.content);
      if (!validation.success) throw new Error(validation.error);
      const css = validation.data;
      if (typeof css !== "string") throw new Error(t("loadError"));
      openConfirmModal({
        title: t("importCss"),
        children: t("importCssConfirm", { title: item.title }),
        onConfirm: () => {
          props.onImport(css);
          props.onClose();
        },
      });
    } catch (cause) {
      showErrorNotification({
        title: t(isTheme ? "theme.browse" : "importCss"),
        message: cause instanceof Error ? cause.message : t("loadError"),
      });
    } finally {
      setPendingId(null);
    }
  };

  if (review && props.type === "customTheme") {
    return (
      <Stack gap="md">
        <Text fw={600}>{review.item.title}</Text>
        <Text size="sm">{t("theme.importConfirm")}</Text>
        {review.theme.customCss && <Text size="sm">{t("theme.cssWarning")}</Text>}
        <WorkshopCodeViewer value={JSON.stringify(review.theme)} language="json" height="240px" />
        <Group justify="space-between">
          <Button
            ref={reviewBack}
            variant="default"
            onClick={() => {
              setReview(null);
              requestAnimationFrame(() => searchInput.current?.focus());
            }}
          >
            {t("theme.backToThemes")}
          </Button>
          <Button
            onClick={() => {
              props.onImport(review.theme);
              props.onClose();
            }}
          >
            {t("theme.loadDraft")}
          </Button>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        {t(isTheme ? "theme.browseHint" : "securityNoticeCss")}
      </Text>
      <TextInput
        ref={searchInput}
        data-autofocus
        aria-label={searchLabel}
        placeholder={`${searchLabel}...`}
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
        ariaLabel={t(isTheme ? "theme.listLabel" : "listAriaLabelCss")}
        cols={{ base: 1, sm: 2 }}
        emptyState={<NoResults icon={IconSearch} title={t(isTheme ? "theme.empty" : "emptyCss")} />}
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
              <Button
                size="sm"
                disabled={pendingId !== null && pendingId !== item.id}
                loading={pendingId === item.id}
                onClick={() => void reviewSubmission(item)}
              >
                {t(isTheme ? "theme.review" : "useCss")}
              </Button>
            </Group>
          </>
        )}
      />
      {totalPages > 1 && <Pagination total={totalPages} value={page} onChange={setPage} mx="auto" />}
    </Stack>
  );
}
