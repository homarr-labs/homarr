"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Group,
  Image,
  Modal,
  Pagination,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { IconAlertTriangle, IconBrandGithub, IconDownload, IconExternalLink, IconSearch } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import type { WorkshopSubmissionDetail, WorkshopSubmissionType } from "@homarr/workshop";

import { WORKSHOP_API_URL, WORKSHOP_WEB_URL, WorkshopClient, workshopExportFilename } from "@homarr/workshop";
import { useScopedI18n } from "@homarr/translation/client";

const apiUrl = process.env.NEXT_PUBLIC_WORKSHOP_API_URL ?? WORKSHOP_API_URL;

export interface WorkshopBrowserProps {
  initialType?: WorkshopSubmissionType | "all";
  lockedType?: WorkshopSubmissionType;
  onUse?: (submission: WorkshopSubmissionDetail) => Promise<void> | void;
  useLabel?: string;
}

export function WorkshopBrowser({ initialType = "all", lockedType, onUse, useLabel }: WorkshopBrowserProps) {
  const t = useScopedI18n("workshop");
  const client = useMemo(() => new WorkshopClient(apiUrl), []);
  const [page, setPage] = useState(1);
  const [type, setType] = useState<WorkshopSubmissionType | "all">(initialType);
  const [sort, setSort] = useState<"top" | "newest">("top");
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 250);
  const [selected, setSelected] = useState<WorkshopSubmissionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [usePending, setUsePending] = useState(false);
  const [useError, setUseError] = useState("");

  const query = useQuery({
    queryKey: ["workshop", "list", page, type, sort, debouncedSearch],
    queryFn: () => client.list({ page, type, sort, search: debouncedSearch, perPage: 12 }),
  });

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      setSelected(await client.get(id));
    } finally {
      setDetailLoading(false);
    }
  };

  const download = (submission: WorkshopSubmissionDetail) => {
    const url = URL.createObjectURL(
      new Blob([submission.content], { type: submission.type === "css" ? "text/css" : "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = workshopExportFilename(submission.title, submission.type);
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Stack gap="lg">
      <Alert icon={<IconAlertTriangle size={18} />} color="yellow" title={t("safety.title")}>
        {t("safety.description")}
      </Alert>
      <Group align="end">
        <TextInput
          label={t("search.label")}
          placeholder={t("search.placeholder")}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
            setPage(1);
          }}
          style={{ flex: 1 }}
        />
        <Select
          label={t("filter.type")}
          value={type}
          disabled={Boolean(lockedType)}
          onChange={(value) => {
            setType((value ?? "all") as typeof type);
            setPage(1);
          }}
          data={[
            { value: "all", label: t("filter.all") },
            { value: "widget", label: t("filter.widgets") },
            { value: "css", label: t("filter.css") },
          ]}
        />
        <Select
          label={t("filter.sort")}
          value={sort}
          onChange={(value) => {
            setSort((value ?? "top") as typeof sort);
            setPage(1);
          }}
          data={[
            { value: "top", label: t("filter.top") },
            { value: "newest", label: t("filter.newest") },
          ]}
        />
      </Group>
      {query.error && (
        <Alert color="red" title={t("error.loadTitle")}>
          {query.error.message}
          <Button variant="subtle" onClick={() => void query.refetch()}>
            {t("action.retry")}
          </Button>
        </Alert>
      )}
      {query.isLoading ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          <Skeleton h={280} />
          <Skeleton h={280} />
          <Skeleton h={280} />
        </SimpleGrid>
      ) : query.data?.items.length ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {query.data.items.map((item) => (
            <Card key={item.id} withBorder padding="md">
              {item.screenshots[0] ? (
                <Card.Section>
                  <Image src={client.fileUrl(item.id, item.screenshots[0], "480x320")} h={170} alt="" />
                </Card.Section>
              ) : (
                <Card.Section>
                  <Box
                    h={170}
                    bg="var(--mantine-color-default-hover)"
                    style={{ display: "grid", placeItems: "center" }}
                  >
                    <Text ff="monospace" fw={700}>
                      {item.type === "widget" ? "{}" : "CSS"}
                    </Text>
                  </Box>
                </Card.Section>
              )}
              <Stack gap="xs" mt="md">
                <Group justify="space-between">
                  <Badge variant="light">{item.type === "widget" ? t("type.widget") : t("type.css")}</Badge>
                  <Text size="sm" c="dimmed">
                    {item.score >= 0 ? "+" : ""}
                    {item.score}
                  </Text>
                </Group>
                <Text fw={600} lineClamp={1}>
                  {item.title}
                </Text>
                <Text size="sm" c="dimmed" lineClamp={2}>
                  {item.description || t("empty.description")}
                </Text>
                <Text size="xs" c="dimmed">
                  {t("by", { name: item.authorName, revision: item.revision })}
                </Text>
                <Button variant="light" onClick={() => void openDetail(item.id)}>
                  {t("action.inspect")}
                </Button>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      ) : (
        <Stack align="center" py="xl">
          <Text fw={600}>{t("empty.title")}</Text>
          <Text c="dimmed">{t("empty.description")}</Text>
        </Stack>
      )}
      {(query.data?.totalPages ?? 0) > 1 && (
        <Pagination total={query.data?.totalPages ?? 1} value={page} onChange={setPage} mx="auto" />
      )}
      <Modal
        opened={Boolean(selected) || detailLoading}
        onClose={() => setSelected(null)}
        title={selected?.title ?? t("loading")}
        size="xl"
      >
        {detailLoading || !selected ? (
          <Skeleton h={400} />
        ) : (
          <Stack>
            <Group>
              <Badge>{selected.type === "widget" ? t("type.widget") : t("type.css")}</Badge>
              <Text size="sm" c="dimmed">
                {t("by", { name: selected.authorName, revision: selected.revision })}
              </Text>
            </Group>
            <Text>{selected.description}</Text>
            <Alert icon={<IconAlertTriangle size={18} />} color="yellow">
              {t("safety.inspect")}
            </Alert>
            <Code block mah={360} style={{ overflow: "auto", whiteSpace: "pre" }}>
              {selected.content}
            </Code>
            <Group justify="space-between">
              <Group>
                <Button variant="default" leftSection={<IconDownload size={16} />} onClick={() => download(selected)}>
                  {t("action.download")}
                </Button>
                <Button
                  component="a"
                  href={`${WORKSHOP_WEB_URL}/${selected.id}`}
                  target="_blank"
                  variant="subtle"
                  leftSection={<IconExternalLink size={16} />}
                >
                  {t("action.website")}
                </Button>
              </Group>
              {onUse && (
                <Button
                  loading={usePending}
                  onClick={async () => {
                    setUsePending(true);
                    setUseError("");
                    try {
                      if (lockedType && selected.type !== lockedType) throw new Error(t("error.wrongType"));
                      await onUse(selected);
                      setSelected(null);
                    } catch (caught) {
                      setUseError(caught instanceof Error ? caught.message : t("error.install"));
                    } finally {
                      setUsePending(false);
                    }
                  }}
                >
                  {useLabel ?? t("action.use")}
                </Button>
              )}
            </Group>
            {useError && <Alert color="red">{useError}</Alert>}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}

export function PublishToWorkshopButton({
  type,
  getContent,
  defaultTitle,
  compact = false,
  renderTrigger,
}: {
  type: WorkshopSubmissionType;
  getContent: () => Promise<string> | string;
  defaultTitle: string;
  compact?: boolean;
  renderTrigger?: (open: () => void) => ReactNode;
}) {
  const t = useScopedI18n("workshop");
  const client = useMemo(() => new WorkshopClient(apiUrl), []);
  const [opened, { open, close }] = useDisclosure(false);
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const [changelog, setChangelog] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => setTitle(defaultTitle), [defaultTitle]);
  const publish = async () => {
    setPending(true);
    setError("");
    try {
      if (!client.currentUser) await client.signInWithGitHub();
      await client.create({ type, title, description, changelog, content: await getContent() });
      close();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("error.publish"));
    } finally {
      setPending(false);
    }
  };
  return (
    <>
      {renderTrigger ? (
        renderTrigger(open)
      ) : (
        <Button
          size={compact ? "xs" : undefined}
          variant="default"
          leftSection={<IconBrandGithub size={16} />}
          onClick={open}
        >
          {t("action.share")}
        </Button>
      )}
      <Modal opened={opened} onClose={close} title={t("publish.title")}>
        <Stack>
          <TextInput
            required
            label={t("publish.name")}
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
          />
          <Textarea
            label={t("publish.description")}
            value={description}
            onChange={(event) => setDescription(event.currentTarget.value)}
          />
          <Textarea
            label={t("publish.changelog")}
            value={changelog}
            onChange={(event) => setChangelog(event.currentTarget.value)}
          />
          {error && <Alert color="red">{error}</Alert>}
          <Group justify="end">
            <Button variant="default" onClick={close}>
              {t("action.cancel")}
            </Button>
            <Button loading={pending} disabled={title.trim().length < 3} onClick={() => void publish()}>
              {t("action.publish")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
