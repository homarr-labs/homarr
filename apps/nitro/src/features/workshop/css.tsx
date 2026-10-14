import { useState } from "react";
import type { ButtonProps } from "@mantine/core";
import {
  ActionIcon,
  Alert,
  Button,
  Group,
  Loader,
  Modal,
  Pagination,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { IconDownload, IconExternalLink, IconSearch } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { useI18n } from "@homarr/translation/client";
import { WorkshopCodeViewer, WorkshopSubmissionGrid } from "../../source-ui/workshop";
import type { WorkshopGridState, WorkshopSubmissionDetail } from "../../source-ui/workshop/contracts";
import { WorkshopVoteControl } from "./community";
import { useWorkshopMutation } from "./flow";
import type { WorkshopFlowLease } from "./flow";
import { useWorkshopFeature, WorkshopFailure, WorkshopTransportHold } from "./scope";

export function WorkshopCssImportButton({
  onImport,
  size,
  workshopWebUrl,
}: {
  onImport(css: string): void;
  size?: ButtonProps["size"];
  workshopWebUrl?: string;
}) {
  const t = useI18n("workshop");
  const [opened, controls] = useDisclosure(false);
  return (
    <>
      <Button
        type="button"
        size={size}
        variant="light"
        leftSection={<IconDownload size={16} />}
        onClick={controls.open}
      >
        {t("importCss")}
      </Button>
      <Modal opened={opened} onClose={controls.close} title={t("importCss")} size="xl" radius="md">
        {opened && (
          <WorkshopCssPicker
            onImport={(css) => {
              onImport(css);
              controls.close();
            }}
            workshopWebUrl={workshopWebUrl}
          />
        )}
      </Modal>
    </>
  );
}

export function WorkshopCssPicker({
  onImport,
  workshopWebUrl,
}: {
  onImport(css: string): void;
  workshopWebUrl?: string;
}) {
  const { transport, queryKey, readOnly, communitySchema, presentation } = useWorkshopFeature();
  const t = useI18n("workshop");
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 250);
  const [page, setPage] = useState(1);
  const [review, setReview] = useState<{
    submission: WorkshopSubmissionDetail;
    css: string;
    lease: WorkshopFlowLease;
  } | null>(null);
  const query = useQuery({
    queryKey: [
      ...queryKey,
      "css",
      transport.kind === "available" ? transport.authorityKey : "held",
      { search: debouncedSearch, page },
    ],
    enabled: transport.kind === "available",
    queryFn: ({ signal }) => {
      if (transport.kind !== "available") throw new Error("Workshop CSS browsing is held");
      return transport.client.list({
        page,
        perPage: 8,
        type: "customCss",
        sort: "top",
        search: debouncedSearch,
        signal,
      });
    },
  });
  const inspect = useWorkshopMutation({
    identity: "css-picker",
    recipient: onImport,
    mutationFn: async (submissionId: string, lease) => {
      if (transport.kind !== "available" || !communitySchema) throw new Error("Workshop CSS validation is held");
      const submission = await transport.client.get(submissionId, lease.signal);
      lease.assertCurrent();
      if (submission.type !== "customCss") throw new Error("Not a CSS submission");
      const validation = communitySchema.validateWorkshopContent("customCss", submission.content);
      if (!validation.success || typeof validation.data !== "string") throw new Error("Invalid Workshop CSS");
      return { submission, css: validation.data };
    },
    onSuccess: (result, lease) => setReview({ ...result, lease }),
  });
  let state: WorkshopGridState;
  if (transport.kind === "held") state = { status: "held", content: <WorkshopTransportHold /> };
  else if (query.isPending) state = { status: "loading" };
  else if (query.isError) state = { status: "failed", pending: query.isFetching, retry: () => void query.refetch() };
  else state = { status: "loaded", items: query.data.items };
  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        {t("securityNoticeCss")}
      </Text>
      {!communitySchema && (
        <Alert color="yellow">CSS import is unavailable until the actual Workshop content validator is joined.</Alert>
      )}
      {readOnly && <Alert color="yellow">CSS application is disabled in this read-only session.</Alert>}
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
        state={state}
        fileUrl={
          transport.kind === "available"
            ? (id, filename, thumb) => transport.client.fileUrl(id, filename, thumb)
            : undefined
        }
        ariaLabel={t("listAriaLabelCss")}
        cols={{ base: 1, sm: 2 }}
        emptyState={
          <Stack align="center" py="xl">
            <IconSearch size={48} />
            <Text fw={600}>{t("emptyCss")}</Text>
          </Stack>
        }
        renderActions={(item) => (
          <>
            <WorkshopVoteControl submissionId={item.id} score={item.score} size="sm" />
            <Group gap={4} wrap="nowrap">
              {workshopWebUrl && (
                <Tooltip label={t("openCommunity")}>
                  <ActionIcon
                    component="a"
                    href={`${workshopWebUrl.replace(/\/+$/u, "")}/${encodeURIComponent(item.id)}`}
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
              )}
              <Button
                size="sm"
                disabled={readOnly || !communitySchema || inspect.isPending}
                loading={inspect.isPending && inspect.variables?.input === item.id}
                onClick={() => {
                  setReview(null);
                  inspect.mutate(item.id);
                }}
              >
                {t("useCss")}
              </Button>
            </Group>
          </>
        )}
      />
      {inspect.isError && <WorkshopFailure error={inspect.error} />}
      {query.data && query.data.totalPages > 1 && (
        <Pagination total={query.data.totalPages} value={page} onChange={setPage} mx="auto" />
      )}
      <Modal opened={review !== null} onClose={() => setReview(null)} title={t("importCss")} size="lg">
        {review && (
          <Stack>
            <Text>{t("importCssConfirm", { title: review.submission.title })}</Text>
            <Text size="sm" c="dimmed">
              This places the reviewed rules in your local editor. It does not persist board or server settings.
            </Text>
            <WorkshopCodeViewer value={review.css} language="css" code={presentation?.code} />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setReview(null)}>
                Cancel
              </Button>
              <Button
                disabled={readOnly || !review.lease.isCurrent()}
                onClick={() => {
                  if (readOnly || !review.lease.isCurrent()) return;
                  const css = review.css;
                  setReview(null);
                  onImport(css);
                }}
              >
                {t("useCss")}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
