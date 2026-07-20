"use client";

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
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import {
  IconAlertTriangle,
  IconBuildingStore,
  IconDownload,
  IconFlag,
  IconSearch,
  IconThumbDown,
  IconThumbUp,
} from "@tabler/icons-react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { WorkshopReport, WorkshopSubmissionDetail, WorkshopUser } from "@homarr/workshop";
import { WORKSHOP_API_URL, WorkshopClient, workshopExportFilename } from "@homarr/workshop";
import { customWidgetImportSchema } from "@homarr/custom-widgets/core";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

const workshopUrl = process.env.NEXT_PUBLIC_WORKSHOP_API_URL ?? WORKSHOP_API_URL;

function downloadWorkshopSubmission(submission: WorkshopSubmissionDetail) {
  const url = URL.createObjectURL(new Blob([submission.content], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = workshopExportFilename(submission.title);
  link.click();
  URL.revokeObjectURL(url);
}

export function WorkshopBrowser({ onInstall }: { onInstall?(submission: WorkshopSubmissionDetail): Promise<void> }) {
  const t = useScopedI18n("workshop");
  const client = useMemo(() => new WorkshopClient(workshopUrl), []);
  const queryClient = useQueryClient();
  const [user, setUser] = useState<WorkshopUser | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"top" | "newest">("top");
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 250);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reportOpened, reportControls] = useDisclosure(false);
  const [reportCategory, setReportCategory] = useState<WorkshopReport["category"]>("other");
  const [reportExplanation, setReportExplanation] = useState("");
  const [loginPending, setLoginPending] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = client.subscribeToAuth(setUser);
    void client.refreshAuth().then(setUser);
    return unsubscribe;
  }, [client]);

  const list = useQuery({
    queryKey: ["workshop", "list", page, sort, debouncedSearch],
    queryFn: ({ signal }) => client.list({ page, perPage: 12, sort, search: debouncedSearch, signal }),
    placeholderData: keepPreviousData,
  });
  const detail = useQuery({
    queryKey: ["workshop", "detail", selectedId],
    queryFn: ({ signal }) => client.get(selectedId ?? "", signal),
    enabled: selectedId !== null,
  });
  const signIn = () => {
    setLoginPending(true);
    setLoginError(null);
    void client
      .signInWithGitHub()
      .then(setUser)
      .catch((cause: unknown) => {
        const message = cause instanceof Error ? cause.message : t("signInError");
        setLoginError(message);
        showErrorNotification({ title: t("signIn"), message });
      })
      .finally(() => setLoginPending(false));
  };
  const install = useMutation({
    mutationFn: async (submission: WorkshopSubmissionDetail) => onInstall?.(submission),
    onSuccess: () => setSelectedId(null),
  });
  const vote = useMutation({
    mutationFn: ({ submission, value }: { submission: string; value: 1 | -1 }) => client.vote(submission, value),
    onSuccess: async () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["workshop", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["workshop", "detail"] }),
      ]),
  });
  const report = useMutation({
    mutationFn: () => client.report(selectedId ?? "", reportCategory, reportExplanation),
    onSuccess: () => {
      reportControls.close();
      setReportExplanation("");
      showSuccessNotification({ title: t("reportSent"), message: t("reportSentDescription") });
    },
  });

  return (
    <Stack gap="lg">
      <Card withBorder radius="lg" p="lg">
        <Group justify="space-between" align="flex-start">
          <Group align="flex-start">
            <Box
              p="sm"
              bg="var(--mantine-color-default-hover)"
              style={{ borderRadius: "var(--mantine-radius-md)", lineHeight: 0 }}
            >
              <IconBuildingStore size={24} />
            </Box>
            <Box>
              <Title order={2}>{t("title")}</Title>
              <Text c="dimmed" size="sm" maw={640}>
                {t("description")}
              </Text>
            </Box>
          </Group>
          {user ? (
            <Group gap="xs">
              <Badge variant="light">{user.displayName}</Badge>
              <Button
                size="xs"
                variant="subtle"
                onClick={() => {
                  client.signOut();
                  setUser(null);
                }}
              >
                {t("signOut")}
              </Button>
            </Group>
          ) : (
            <Button size="xs" loading={loginPending} onClick={signIn}>
              {t("signIn")}
            </Button>
          )}
        </Group>
      </Card>
      <Alert color="yellow" icon={<IconAlertTriangle size={18} />}>
        {t("securityNotice")}
      </Alert>
      {loginError && <Alert color="red">{loginError}</Alert>}
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <TextInput
          label={t("search")}
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
            setPage(1);
          }}
        />
        <Select
          label={t("sort")}
          value={sort}
          onChange={(value) => {
            setSort(value === "newest" ? "newest" : "top");
            setPage(1);
          }}
          data={[
            { value: "top", label: t("sortTop") },
            { value: "newest", label: t("sortNewest") },
          ]}
          allowDeselect={false}
        />
      </SimpleGrid>
      {list.isLoading ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          <Skeleton h={280} />
          <Skeleton h={280} />
          <Skeleton h={280} />
        </SimpleGrid>
      ) : list.isError ? (
        <Alert color="red">{t("unavailable")}</Alert>
      ) : list.data?.items.length ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {list.data.items.map((item) => (
            <Card key={item.id} withBorder radius="md" p="md">
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
                    <Code>JSX</Code>
                  </Box>
                </Card.Section>
              )}
              <Stack gap="xs" mt="md">
                <Group justify="space-between">
                  <Badge variant="light">v{item.revision}</Badge>
                  <Text size="sm" c="dimmed">
                    <IconThumbUp size={13} /> {item.upvotes} · <IconThumbDown size={13} /> {item.downvotes}
                  </Text>
                </Group>
                <Text fw={700} lineClamp={1}>
                  {item.title}
                </Text>
                <Text size="sm" c="dimmed" lineClamp={2}>
                  {item.description || t("noDescription")}
                </Text>
                <Text size="xs" c="dimmed">
                  {t("author", { name: item.authorName })}
                </Text>
                <Button variant="light" onClick={() => setSelectedId(item.id)}>
                  {t("inspect")}
                </Button>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      ) : (
        <Text c="dimmed" ta="center" py="xl">
          {t("empty")}
        </Text>
      )}
      {(list.data?.totalPages ?? 0) > 1 && (
        <Pagination total={list.data?.totalPages ?? 1} value={page} onChange={setPage} mx="auto" />
      )}

      <Modal
        opened={selectedId !== null}
        onClose={() => setSelectedId(null)}
        title={detail.data?.title ?? t("details")}
        size="xl"
      >
        {detail.isPending ? (
          <Skeleton h={400} />
        ) : detail.isError || !detail.data ? (
          <Alert color="red">{t("loadError")}</Alert>
        ) : (
          <Stack>
            <Text>{detail.data.description}</Text>
            <Group>
              <Badge>{t("revision", { revision: detail.data.revision })}</Badge>
              <Text size="sm" c="dimmed">
                SHA-256 {detail.data.contentHash.slice(0, 12)}…
              </Text>
            </Group>
            {detail.data.screenshots.length > 0 && (
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                {detail.data.screenshots.map((file, index) => (
                  <Image
                    key={file}
                    src={client.fileUrl(detail.data.id, file, "960x640")}
                    radius="md"
                    alt={`${detail.data.title} screenshot ${index + 1}`}
                  />
                ))}
              </SimpleGrid>
            )}
            <CapabilitySummary content={detail.data.content} />
            <Code block mah={360} style={{ overflow: "auto", whiteSpace: "pre" }}>
              {detail.data.content}
            </Code>
            <Group justify="space-between">
              <Group gap="xs">
                <Button
                  variant="default"
                  leftSection={<IconDownload size={16} />}
                  onClick={() => downloadWorkshopSubmission(detail.data)}
                >
                  {t("export")}
                </Button>
                <Button
                  variant="subtle"
                  leftSection={<IconThumbUp size={16} />}
                  disabled={!user}
                  onClick={() => vote.mutate({ submission: detail.data.id, value: 1 })}
                >
                  {detail.data.upvotes}
                </Button>
                <Button
                  variant="subtle"
                  leftSection={<IconThumbDown size={16} />}
                  disabled={!user}
                  onClick={() => vote.mutate({ submission: detail.data.id, value: -1 })}
                >
                  {detail.data.downvotes}
                </Button>
                <Button
                  variant="subtle"
                  color="red"
                  leftSection={<IconFlag size={16} />}
                  disabled={!user}
                  onClick={reportControls.open}
                >
                  {t("report")}
                </Button>
              </Group>
              {onInstall && (
                <Button loading={install.isPending} onClick={() => install.mutate(detail.data)}>
                  {t("install")}
                </Button>
              )}
            </Group>
            {!user && (
              <Text size="xs" c="dimmed">
                {t("signInHint")}
              </Text>
            )}
            {vote.error && <Alert color="red">{t("voteError")}</Alert>}
            {install.error && <Alert color="red">{install.error.message}</Alert>}
          </Stack>
        )}
      </Modal>

      <Modal opened={reportOpened} onClose={reportControls.close} title={t("reportTitle")}>
        <Stack>
          <Select
            label={t("reportReason")}
            value={reportCategory}
            onChange={(value) => setReportCategory((value as WorkshopReport["category"]) ?? "other")}
            data={["malicious", "spam", "copyright", "inappropriate", "other"]}
            allowDeselect={false}
          />
          <Textarea
            label={t("reportExplanation")}
            minRows={4}
            value={reportExplanation}
            onChange={(event) => setReportExplanation(event.currentTarget.value)}
          />
          {report.error && <Alert color="red">{report.error.message}</Alert>}
          <Button
            loading={report.isPending}
            disabled={reportExplanation.trim().length < 3}
            onClick={() => report.mutate()}
          >
            {t("reportSend")}
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}

function CapabilitySummary({ content }: { content: string }) {
  const t = useScopedI18n("workshop");
  let candidate: unknown;
  try {
    candidate = JSON.parse(content) as unknown;
  } catch {
    return null;
  }
  const parsed = customWidgetImportSchema.safeParse(candidate);
  if (!parsed.success) return null;
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      <Card withBorder p="sm">
        <Text fw={600} size="sm" mb="xs">
          {t("sources")}
        </Text>
        <Stack gap={6}>
          {parsed.data.sources.map((source) => (
            <Box key={source.id}>
              <Text size="sm" fw={500}>
                {source.name}
              </Text>
              <Group gap={4}>
                <Badge size="xs" variant="light">
                  {new URL(source.baseUrl).origin}
                </Badge>
                <Badge size="xs" variant="outline">
                  {source.networkScope}
                </Badge>
                <Badge size="xs" variant="outline">
                  {source.auth.type}
                </Badge>
              </Group>
            </Box>
          ))}
        </Stack>
      </Card>
      <Card withBorder p="sm">
        <Text fw={600} size="sm" mb="xs">
          {t("requests")}
        </Text>
        {parsed.data.requests.length === 0 ? (
          <Text size="xs" c="dimmed">
            {t("noRequests")}
          </Text>
        ) : (
          <Stack gap={6}>
            {parsed.data.requests.map((request) => (
              <Group key={request.id} justify="space-between" wrap="nowrap">
                <Text size="xs" ff="monospace" truncate>
                  {request.id}
                </Text>
                <Group gap={4} wrap="nowrap">
                  <Badge size="xs">{request.kind}</Badge>
                  <Badge size="xs" variant="light">
                    {request.method}
                  </Badge>
                  <Badge size="xs" variant="outline">
                    {request.minimumBoardPermission}
                  </Badge>
                </Group>
              </Group>
            ))}
          </Stack>
        )}
      </Card>
    </SimpleGrid>
  );
}
