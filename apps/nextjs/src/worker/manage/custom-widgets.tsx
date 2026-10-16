"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Badge, Box, Container, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { IconExternalLink, IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import CustomJsxDisplay from "@homarr/widgets/custom-api/custom-jsx-display";

import { CustomWidgetForm } from "~/app/[locale]/manage/custom-widgets/_custom-widget-form";
import { CustomWidgetList } from "~/app/[locale]/manage/custom-widgets/_custom-widget-list";
import { CustomWidgetTabs } from "~/app/[locale]/manage/custom-widgets/_custom-widget-tabs";
import { FormErrorBoundary } from "~/app/[locale]/manage/custom-widgets/_form-error-boundary";
import { ImportCustomWidgetButton } from "~/app/[locale]/manage/custom-widgets/_import-custom-widget-button";
import { WorkshopPublishForm } from "~/app/[locale]/manage/custom-widgets/publish/[id]/_workshop-publish-form";
import { WorkshopDetail } from "~/app/[locale]/manage/custom-widgets/workshop/[id]/_workshop-detail";
import { WorkshopBrowse } from "~/app/[locale]/manage/custom-widgets/workshop/_workshop-browse";
import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { MobileAffixButton } from "~/components/manage/mobile-affix-button";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";

import type { WorkerRouteProps } from "./collections";
import { WorkerQuery, WorkerQueryStatus } from "./query-state";

export function WorkerCustomWidgetsRoute({ segments, searchParams }: WorkerRouteProps) {
  if (segments[1] === "new") return <WorkerCustomWidgetNew />;
  if (segments[1] === "edit" && segments[2]) return <WorkerCustomWidgetEdit id={segments[2]} />;
  if (segments[1] === "preview" && segments[2]) return <WorkerCustomWidgetPreview id={segments[2]} />;
  if (segments[1] === "publish" && segments[2]) return <WorkerCustomWidgetPublish id={segments[2]} />;
  if (segments[1] === "workshop" && segments[2]) return <WorkshopDetail id={segments[2]} />;
  if (segments[1] === "workshop") return <WorkerWorkshopBrowse searchParams={searchParams} />;
  return <WorkerCustomWidgetList />;
}

function WorkerCustomWidgetList() {
  const query = clientApi.customWidget.list.useQuery();
  const t = useI18n("customWidget");
  const tCommon = useI18n("common");
  return (
    <WorkerQuery query={query}>
      {(definitions) => (
        <ManagePageLayout
          title={tCommon("entity.customWidgets")}
          primaryAction={
            <Group gap="xs">
              <MobileAffixButton
                component="a"
                href="https://www.skills.sh/homarr-labs/homarr/homarr-custom-widget"
                target="_blank"
                rel="noopener noreferrer"
                leftSection={<IconExternalLink size={16} />}
                variant="default"
              >
                {t("action.downloadSkill")}
              </MobileAffixButton>
              <ImportCustomWidgetButton />
              <MobileAffixButton
                component={Link}
                href="/manage/custom-widgets/new"
                leftSection={<IconPlus size={16} />}
              >
                {tCommon("action.create")}
              </MobileAffixButton>
            </Group>
          }
          toolbar={<CustomWidgetTabs active="installed" />}
        >
          <CustomWidgetList definitions={definitions} />
        </ManagePageLayout>
      )}
    </WorkerQuery>
  );
}

function WorkerCustomWidgetNew() {
  const t = useI18n("customWidget");
  return (
    <>
      <DynamicBreadcrumb />
      <Container fluid>
        <Stack>
          <div>
            <Title>{t("page.create.title")}</Title>
            <Text c="dimmed" size="sm" mt={4}>
              {t("page.create.subtitle")}
            </Text>
          </div>
          <FormErrorBoundary>
            <CustomWidgetForm mode="create" />
          </FormErrorBoundary>
        </Stack>
      </Container>
    </>
  );
}

function WorkerCustomWidgetEdit({ id }: { id: string }) {
  const query = clientApi.customWidget.get.useQuery({ id });
  return (
    <WorkerQuery query={query}>
      {(definition) => (
        <>
          <DynamicBreadcrumb dynamicMappings={new Map([[id, definition.name]])} nonInteractable={["edit"]} />
          <Container fluid>
            <Stack>
              <Title>{definition.name}</Title>
              <FormErrorBoundary>
                <CustomWidgetForm
                  mode="edit"
                  definitionId={id}
                  initialValues={{
                    name: definition.name,
                    description: definition.description ?? "",
                    iconUrl: definition.iconUrl ?? "",
                    sources: JSON.stringify(definition.sources, null, 2),
                    requests: JSON.stringify(definition.requests, null, 2),
                    options: JSON.stringify(definition.options, null, 2),
                    template: definition.template,
                    secrets: definition.secrets.map((secret) => ({
                      sourceId: secret.sourceId,
                      kind: secret.kind,
                      value: "",
                      hasValue: true,
                    })),
                  }}
                />
              </FormErrorBoundary>
            </Stack>
          </Container>
        </>
      )}
    </WorkerQuery>
  );
}

function WorkerCustomWidgetPublish({ id }: { id: string }) {
  const query = clientApi.customWidget.get.useQuery({ id });
  return (
    <WorkerQuery query={query}>
      {(definition) => <WorkshopPublishForm widget={{ id, name: definition.name }} />}
    </WorkerQuery>
  );
}

function WorkerCustomWidgetPreview({ id }: { id: string }) {
  const previewQuery = clientApi.customWidget.previewGet.useQuery({ sessionId: id });
  const utils = clientApi.useUtils();
  const preview = previewQuery.data;
  const results = useQuery({
    queryKey: ["worker-custom-widget-preview", id, preview?.id],
    enabled: Boolean(preview),
    queryFn: async () => {
      if (!preview) throw new Error("Preview session unavailable");
      return await Promise.all(
        preview.requests
          .filter((request) => request.kind === "query" && request.trigger === "load")
          .map(async (request) => {
            const result = await utils.client.customWidget.previewQuery
              .query({ sessionId: id, requestId: request.id, params: {} })
              .catch((cause: unknown) => ({
                ok: false,
                status: 0,
                statusText: "Error",
                data: null,
                error: cause instanceof Error ? cause.message : "Request failed",
              }));
            return [request.id, result] as const;
          }),
      );
    },
  });
  if (!preview || !results.data) return <WorkerQueryStatus queries={[previewQuery, results]} />;
  const data = Object.fromEntries(results.data.map(([requestId, result]) => [requestId, result.data]));
  const status = Object.fromEntries(
    results.data.map(([requestId, result]) => [
      requestId,
      { loading: false, ok: result.ok, status: result.status, error: result.error },
    ]),
  );
  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="end">
          <Box>
            <Text size="sm" c="dimmed" fw={600}>
              CUSTOM WIDGET PREVIEW
            </Text>
            <Title>{preview.name}</Title>
          </Box>
          <Badge variant="light">Expires {new Date(preview.expiresAt).toLocaleTimeString()}</Badge>
        </Group>
        <Paper withBorder radius="lg" p="md" mih={360} style={{ overflow: "auto" }}>
          <CustomJsxDisplay
            data={{
              template: preview.template,
              data,
              status,
              options: preview.options,
              requestCapabilities: preview.requests,
              previewSessionId: preview.id,
              previewLiveActions: preview.liveActions,
            }}
          />
        </Paper>
      </Stack>
    </Container>
  );
}

function WorkerWorkshopBrowse({ searchParams }: { searchParams: URLSearchParams }) {
  const setupQuery = clientApi.frontend.setup.useQuery();
  const requestedPage = Number(searchParams.get("page") ?? 1);
  let page = 1;
  if (Number.isSafeInteger(requestedPage) && requestedPage > 0) page = requestedPage;
  let sort: "top" | "newest" = "top";
  if (searchParams.get("sort") === "newest") sort = "newest";
  return (
    <WorkerQuery query={setupQuery}>
      {(setup) => (
        <WorkshopBrowse
          search={searchParams.get("search")?.trim() || undefined}
          sort={sort}
          page={page}
          workshopWebUrl={setup.workshopUrl}
        />
      )}
    </WorkerQuery>
  );
}

export function WorkerWorkshopRedirect() {
  const router = useRouter();
  useEffect(() => router.replace("/manage/custom-widgets/workshop"), [router]);
  return null;
}
