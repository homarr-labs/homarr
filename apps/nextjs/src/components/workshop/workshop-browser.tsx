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
  Loader,
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

import { CUSTOM_WIDGET_SCHEMA } from "@homarr/custom-widgets/core";
import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import type { WorkshopReport, WorkshopSubmissionDetail, WorkshopSubmissionType, WorkshopUser } from "@homarr/workshop";
import {
  validateWorkshopContent,
  validateWorkshopWidget,
  WORKSHOP_CSS_SCHEMA,
  workshopExportFilename,
} from "@homarr/workshop";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

import { createWorkshopClient } from "./workshop-client";

function downloadWorkshopSubmission(submission: WorkshopSubmissionDetail) {
  const url = URL.createObjectURL(
    new Blob([submission.content], { type: submission.type === "customCss" ? "text/css" : "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = workshopExportFilename(submission.title, submission.type);
  link.click();
  URL.revokeObjectURL(url);
}

interface WorkshopBrowserProps {
  type?: WorkshopSubmissionType;
  onInstall?(widget: HomarrCustomWidgetV2): Promise<void>;
  onUseCss?(css: string): void;
}

export function WorkshopBrowser({ type = "customWidget", onInstall, onUseCss }: WorkshopBrowserProps) {
  const t = useScopedI18n("workshop");
  const client = useMemo(createWorkshopClient, []);
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
  const [cssAwaitingConfirmation, setCssAwaitingConfirmation] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = client.subscribeToAuth(setUser);
    void client.refreshAuth().then(setUser);
    return unsubscribe;
  }, [client]);

  const list = useQuery({
    queryKey: ["workshop", "list", type, page, sort, debouncedSearch],
    queryFn: ({ signal }) => client.list({ page, perPage: 12, type, sort, search: debouncedSearch, signal }),
    placeholderData: keepPreviousData,
  });
  const detail = useQuery({
    queryKey: ["workshop", "detail", selectedId],
    queryFn: ({ signal }) => client.get(selectedId ?? "", signal),
    enabled: selectedId !== null,
  });
  const detailValidation = useMemo(() => {
    if (!detail.data) return null;
    return type === "customCss"
      ? validateWorkshopContent("customCss", detail.data.content)
      : validateWorkshopWidget(detail.data.content);
  }, [detail.data, type]);
  const expectedSchema = type === "customCss" ? WORKSHOP_CSS_SCHEMA : CUSTOM_WIDGET_SCHEMA;
  const detailCompatible =
    detail.data?.type === type && detailValidation?.success === true && detail.data.widgetSchema === expectedSchema;
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
    mutationFn: async (widget: HomarrCustomWidgetV2) => onInstall?.(widget),
    onSuccess: () => setSelectedId(null),
  });
  const useCss = useMutation({
    mutationFn: async (css: string) => onUseCss?.(css),
    onSuccess: () => {
      setCssAwaitingConfirmation(null);
      setSelectedId(null);
    },
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
                {type === "customCss" ? t("descriptionCss") : t("description")}
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
        {type === "customCss" ? t("securityNoticeCss") : t("securityNotice")}
      </Alert>
      {loginError && <Alert color="red">{loginError}</Alert>}
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <TextInput
          label={type === "customCss" ? t("searchCss") : t("search")}
          leftSection={<IconSearch size={16} />}
          rightSection={list.isFetching ? <Loader size={16} /> : undefined}
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
        <Alert color="red">{list.error instanceof Error ? list.error.message : t("unavailable")}</Alert>
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
                    <Code>{item.type === "customCss" ? "CSS" : "JSX"}</Code>
                  </Box>
                </Card.Section>
              )}
              <Stack gap="xs" mt="md">
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">
                    {t("author", { name: item.authorName })}
                  </Text>
                  <Text size="sm" c="dimmed">
                    <IconThumbUp size={13} /> {item.upvotes} · <IconThumbDown size={13} /> {item.downvotes}
                  </Text>
                </Group>
                <Badge color={item.widgetSchema === expectedSchema ? "green" : "red"} variant="light">
                  {item.widgetSchema}
                </Badge>
                <Group gap="xs">
                  {item.outdated && <Badge color="yellow">Outdated</Badge>}
                  {item.reportCount > 0 && (
                    <Badge color="red">
                      {item.reportCount} report{item.reportCount === 1 ? "" : "s"}
                    </Badge>
                  )}
                </Group>
                <Text fw={700} lineClamp={1}>
                  {item.title}
                </Text>
                <Text size="sm" c="dimmed" lineClamp={2}>
                  {item.description || t("noDescription")}
                </Text>
                <Button variant="light" onClick={() => setSelectedId(item.id)}>
                  {type === "customCss" ? t("inspectCss") : t("inspect")}
                </Button>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      ) : (
        <Text c="dimmed" ta="center" py="xl">
          {type === "customCss" ? t("emptyCss") : t("empty")}
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
          <Alert color="red">{detail.error instanceof Error ? detail.error.message : t("loadError")}</Alert>
        ) : (
          <Stack>
            <Text>{detail.data.description}</Text>
            <Text size="sm" c="dimmed">
              {t("author", { name: detail.data.authorName })}
            </Text>
            {detail.data.outdated && (
              <Alert color="yellow" icon={<IconAlertTriangle size={18} />}>
                The author marked this submission as outdated. Review it carefully before importing.
              </Alert>
            )}
            {detail.data.reportCount > 0 && (
              <Alert color="red" icon={<IconAlertTriangle size={18} />}>
                This submission has {detail.data.reportCount} open community report
                {detail.data.reportCount === 1 ? "" : "s"}. It remains installable, but you should review its content
                first.
              </Alert>
            )}
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
            {type === "customWidget" && detailValidation?.success && typeof detailValidation.data !== "string" && (
              <CapabilitySummary widget={detailValidation.data} />
            )}
            {detailValidation && !detailValidation.success && (
              <Alert color="red" icon={<IconAlertTriangle size={18} />}>
                {t("installErrorDescription")} {detailValidation.error}
              </Alert>
            )}
            {detailValidation?.success && !detailCompatible && (
              <Alert color="red" icon={<IconAlertTriangle size={18} />}>
                {t("installErrorDescription")}
              </Alert>
            )}
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
                  loading={vote.isPending && vote.variables?.value === 1}
                  disabled={!user || vote.isPending}
                  onClick={() => vote.mutate({ submission: detail.data.id, value: 1 })}
                >
                  {detail.data.upvotes}
                </Button>
                <Button
                  variant="subtle"
                  leftSection={<IconThumbDown size={16} />}
                  loading={vote.isPending && vote.variables?.value === -1}
                  disabled={!user || vote.isPending}
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
                <Button
                  loading={install.isPending}
                  disabled={!detailCompatible}
                  onClick={() =>
                    detailValidation?.success &&
                    typeof detailValidation.data !== "string" &&
                    install.mutate(detailValidation.data)
                  }
                >
                  {t("install")}
                </Button>
              )}
              {onUseCss && (
                <Button
                  disabled={!detailCompatible}
                  onClick={() =>
                    detailValidation?.success &&
                    typeof detailValidation.data === "string" &&
                    setCssAwaitingConfirmation(detailValidation.data)
                  }
                >
                  {t("useCss")}
                </Button>
              )}
            </Group>
            {!user && (
              <Text size="xs" c="dimmed">
                {t("signInHint")}
              </Text>
            )}
            {vote.error && <Alert color="red">{vote.error.message || t("voteError")}</Alert>}
            {install.error && <Alert color="red">{install.error.message}</Alert>}
            {useCss.error && <Alert color="red">{useCss.error.message}</Alert>}
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
      <Modal
        opened={cssAwaitingConfirmation !== null}
        onClose={() => setCssAwaitingConfirmation(null)}
        title="Import this Custom CSS?"
      >
        <Stack>
          <Alert color="yellow" icon={<IconAlertTriangle size={18} />}>
            Review community CSS before applying it. Importing replaces the current Custom CSS editor value, but nothing
            is saved until you save the board settings.
          </Alert>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCssAwaitingConfirmation(null)}>
              Cancel
            </Button>
            <Button
              loading={useCss.isPending}
              onClick={() => {
                if (cssAwaitingConfirmation !== null) useCss.mutate(cssAwaitingConfirmation);
              }}
            >
              Import CSS
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

function CapabilitySummary({ widget }: { widget: HomarrCustomWidgetV2 }) {
  const t = useScopedI18n("workshop");
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      <Card withBorder p="sm">
        <Text fw={600} size="sm" mb="xs">
          {t("sources")}
        </Text>
        <Stack gap={6}>
          {Object.entries(widget.sources).map(([sourceId, source]) => (
            <Box key={sourceId}>
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
                  {typeof source.auth === "string" ? source.auth : source.auth.type}
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
        {Object.keys(widget.requests).length === 0 ? (
          <Text size="xs" c="dimmed">
            {t("noRequests")}
          </Text>
        ) : (
          <Stack gap={6}>
            {Object.entries(widget.requests).map(([requestId, request]) => (
              <Group key={requestId} justify="space-between" wrap="nowrap">
                <Text size="xs" ff="monospace" truncate>
                  {requestId}
                </Text>
                <Group gap={4} wrap="nowrap">
                  <Badge size="xs">{request.kind}</Badge>
                  <Badge size="xs" variant="light">
                    {request.method}
                  </Badge>
                  <Badge size="xs" variant="outline">
                    {request.permission}
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
