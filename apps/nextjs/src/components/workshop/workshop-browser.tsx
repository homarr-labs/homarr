"use client";

import { useEffect, useId, useMemo, useState } from "react";
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
import type { ModalProps } from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconBuildingStore,
  IconDownload,
  IconExternalLink,
  IconFlag,
  IconRefresh,
  IconSearch,
  IconThumbDown,
  IconThumbUp,
} from "@tabler/icons-react";
import { CUSTOM_WIDGET_SCHEMA } from "@homarr/custom-widgets/core";
import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import { ReadOnlyCustomWidgetCode } from "@homarr/custom-widgets/workbench";
import type { CustomWidgetEditorMessages } from "@homarr/custom-widgets/workbench";
import {
  useWorkshopCssImportMutation,
  useWorkshopQuery,
  useWorkshopReportSummariesQuery,
  useWorkshopReportMutation,
  useWorkshopSubmissionQuery,
  useWorkshopVoteMutation,
  useWorkshopWidgetImportMutation,
} from "@homarr/workshop/backend";
import type {
  WorkshopReport,
  WorkshopSubmissionDetail,
  WorkshopSubmissionType,
  WorkshopUser,
} from "@homarr/workshop/schema";
import {
  validateWorkshopContent,
  validateWorkshopWidget,
  WORKSHOP_CSS_SCHEMA,
  workshopExportFilename,
} from "@homarr/workshop/schema";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

import { createWorkshopClient, getWorkshopWebUrl } from "./workshop-client";

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
  modalStack?: {
    modalProps: Pick<ModalProps, "size" | "styles">;
    details: WorkshopModalStep;
    report: WorkshopModalStep;
  };
}

interface WorkshopModalStep {
  opened: boolean;
  stackId?: string;
  open(): void;
  close(): void;
}

export function WorkshopBrowser({ type = "customWidget", onInstall, onUseCss, modalStack }: WorkshopBrowserProps) {
  const t = useScopedI18n("workshop");
  const client = useMemo(createWorkshopClient, []);
  const [user, setUser] = useState<WorkshopUser | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"top" | "newest">("top");
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 250);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [internalReportOpened, reportControls] = useDisclosure(false);
  const [reportCategory, setReportCategory] = useState<WorkshopReport["category"]>("other");
  const [reportExplanation, setReportExplanation] = useState("");
  const [loginPending, setLoginPending] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const workshopWebUrl = useMemo(getWorkshopWebUrl, []);
  const detailsOpened = modalStack?.details.opened ?? selectedId !== null;
  const reportOpened = modalStack?.report.opened ?? internalReportOpened;
  const openDetails = (id: string) => {
    setSelectedId(id);
    modalStack?.details.open();
  };
  const closeDetails = () => {
    modalStack?.details.close();
    setSelectedId(null);
  };
  const openReport = modalStack?.report.open ?? reportControls.open;
  const closeReport = modalStack?.report.close ?? reportControls.close;

  useEffect(() => {
    const unsubscribe = client.subscribeToAuth(setUser);
    void client.refreshAuth().then(setUser);
    return unsubscribe;
  }, [client]);

  const list = useWorkshopQuery(client, { page, perPage: 12, type, sort, search: debouncedSearch });
  const detail = useWorkshopSubmissionQuery(client, selectedId ?? "");
  const reportSummaries = useWorkshopReportSummariesQuery(client, selectedId ?? "");
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
  const install = useWorkshopWidgetImportMutation(onInstall);
  const useCss = useWorkshopCssImportMutation(onUseCss, () => setSelectedId(null));
  const vote = useWorkshopVoteMutation(client);
  const report = useWorkshopReportMutation(client);
  const submitReport = () =>
    report.mutate(
      { submission: selectedId ?? "", category: reportCategory, explanation: reportExplanation },
      {
        onSuccess: () => {
          closeReport();
          setReportExplanation("");
          showSuccessNotification({ title: t("reportSent"), message: t("reportSentDescription") });
        },
      },
    );

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
          <Group gap="xs">
            <Button
              component="a"
              href={workshopWebUrl}
              target="_blank"
              rel="noopener noreferrer"
              size="xs"
              variant="default"
              leftSection={<IconExternalLink size={14} />}
            >
              {t("openCommunity")}
            </Button>
            {user ? (
              <>
                <Badge variant="light">{user.name}</Badge>
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
              </>
            ) : (
              <Button size="xs" loading={loginPending} onClick={signIn}>
                {t("signIn")}
              </Button>
            )}
          </Group>
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
        <Alert color="yellow" icon={<IconAlertTriangle size={18} />} title={t("unavailableTitle")}>
          <Stack gap="sm" align="flex-start">
            <Text size="sm">{t("unavailable")}</Text>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconRefresh size={14} />}
              loading={list.isFetching}
              onClick={() => void list.refetch()}
            >
              {t("retry")}
            </Button>
          </Stack>
        </Alert>
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
                    {t("author", { name: item.authorName || "Community member" })}
                  </Text>
                  <Text size="sm" c="dimmed">
                    <IconThumbUp size={13} /> {item.upvotes} · <IconThumbDown size={13} /> {item.downvotes}
                  </Text>
                </Group>
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
                <Button variant="light" onClick={() => openDetails(item.id)}>
                  {type === "customCss" ? t("inspectCss") : t("install")}
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
        {...modalStack?.modalProps}
        opened={detailsOpened}
        onClose={closeDetails}
        stackId={modalStack?.details.stackId}
        title={type === "customCss" ? t("inspectCss") : t("install")}
        size={modalStack?.modalProps.size ?? "xl"}
      >
        {detail.isPending ? (
          <Skeleton h={400} />
        ) : detail.isError || !detail.data ? (
          <Alert color="red">{detail.error instanceof Error ? detail.error.message : t("loadError")}</Alert>
        ) : (
          <Stack gap="lg">
            <Group justify="space-between" align="flex-start">
              <Box>
                <Title order={3}>{detail.data.title}</Title>
                <Text size="sm" c="dimmed">
                  {t("author", { name: detail.data.authorName || "Community member" })}
                </Text>
              </Box>
              <Button
                component="a"
                href={getWorkshopWebUrl(detail.data.id)}
                target="_blank"
                rel="noopener noreferrer"
                variant="default"
                leftSection={<IconExternalLink size={16} />}
              >
                {t("openCommunity")}
              </Button>
            </Group>
            {detail.data.description && <Text>{detail.data.description}</Text>}
            {detail.data.outdated && (
              <Alert color="yellow" icon={<IconAlertTriangle size={18} />}>
                The author marked this submission as outdated. Review it carefully before importing.
              </Alert>
            )}
            {detail.data.reportCount > 0 && (
              <Stack gap="xs">
                <Alert color="red" icon={<IconAlertTriangle size={18} />}>
                  This submission has {detail.data.reportCount} open community report
                  {detail.data.reportCount === 1 ? "" : "s"}. It remains installable, but you should review its content
                  first.
                </Alert>
                {reportSummaries.data?.map((summary) => (
                  <Card key={summary.id} withBorder p="sm">
                    <Badge color="red" variant="light" mb="xs">
                      {summary.category}
                    </Badge>
                    <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                      {summary.explanation}
                    </Text>
                  </Card>
                ))}
                {reportSummaries.data?.length === 0 && (
                  <Text size="xs" c="dimmed">
                    Report details are visible only to this submission's author and Workshop admins.
                  </Text>
                )}
              </Stack>
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
            <WorkshopCodeViewer value={detail.data.content} language={type === "customCss" ? "css" : "json"} />
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
                  onClick={openReport}
                >
                  {t("report")}
                </Button>
              </Group>
              {onInstall && (
                <Button
                  loading={install.isPending}
                  disabled={!detailCompatible}
                  rightSection={<IconArrowRight size={16} />}
                  onClick={() =>
                    detailValidation?.success &&
                    typeof detailValidation.data !== "string" &&
                    install.mutate(detailValidation.data)
                  }
                >
                  {t("continueInstall")}
                </Button>
              )}
              {onUseCss && (
                <Button
                  loading={useCss.isPending}
                  disabled={!detailCompatible}
                  onClick={() =>
                    detailValidation?.success &&
                    typeof detailValidation.data === "string" &&
                    useCss.mutate(detailValidation.data)
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

      <Modal
        {...modalStack?.modalProps}
        opened={reportOpened}
        onClose={closeReport}
        stackId={modalStack?.report.stackId}
        title={t("reportTitle")}
      >
        <Stack>
          <Select
            label={t("reportReason")}
            value={reportCategory}
            onChange={(value) => setReportCategory((value as WorkshopReport["category"]) ?? "other")}
            data={["outdated", "malicious", "spam", "copyright", "inappropriate", "other"]}
            allowDeselect={false}
          />
          <Textarea
            label={t("reportExplanation")}
            minRows={4}
            value={reportExplanation}
            onChange={(event) => setReportExplanation(event.currentTarget.value)}
          />
          {report.error && <Alert color="red">{report.error.message}</Alert>}
          <Button loading={report.isPending} disabled={reportExplanation.trim().length < 3} onClick={submitReport}>
            {t("reportSend")}
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}

function WorkshopCodeViewer({ value, language }: { value: string; language: "json" | "css" }) {
  const id = useId();
  const t = useScopedI18n("customWidget.editor");
  const workshopT = useScopedI18n("workshop");
  const messages: CustomWidgetEditorMessages = {
    languageJsx: t("language.jsx"),
    languageJson: t("language.json"),
    undo: t("action.undo"),
    redo: t("action.redo"),
    components: t("action.components"),
    componentSearch: t("componentReference.search"),
    componentEmpty: t("componentReference.empty"),
    componentCount: (count) => t("componentReference.count", { count }),
    insertStarter: t("action.insertStarter"),
    format: t("action.format"),
    copy: t("action.copy"),
    copied: t("action.copied"),
    schema: t("action.schema"),
    schemaTab: t("reference.schema"),
    minimalTab: t("reference.minimal"),
    fullTab: t("reference.full"),
    errors: (count) => t("status.errors", { count }),
    warnings: (count) => t("status.warnings", { count }),
    ready: t("status.ready"),
    position: (cursor) => t("status.position", cursor),
    characters: (count, limit) =>
      limit ? t("status.charactersWithLimit", { count, limit }) : t("status.characters", { count }),
    diagnosticsTitle: t("diagnostics.title"),
    diagnostic: (diagnostic) => diagnostic.value ?? diagnostic.code,
  };
  let displayValue = value;
  if (language === "json") {
    try {
      displayValue = JSON.stringify(JSON.parse(value) as unknown, null, 2);
    } catch {}
  }
  return (
    <ReadOnlyCustomWidgetCode
      id={`workshop-source-${id}`}
      label={workshopT("sourceCode")}
      language={language}
      value={displayValue}
      messages={messages}
      height="360px"
    />
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
