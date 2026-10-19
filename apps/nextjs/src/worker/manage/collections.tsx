"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  ActionIcon,
  ActionIconGroup,
  Alert,
  Anchor,
  Badge,
  Button,
  Container,
  Fieldset,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconBox, IconPencil, IconPlugX, IconSearch } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { getSafeAppHref, getSafeApplicationUrl } from "@homarr/common";
import { getIntegrationName, integrationKinds } from "@homarr/definitions";
import { AppNewForm } from "@homarr/forms-collection";
import { useI18n } from "@homarr/translation/client";
import { IntegrationAvatar, Link, ResourceAvatar as Avatar, SearchInput, TablePagination } from "@homarr/ui";

import { AppDeleteButton } from "~/app/[locale]/manage/apps/_app-delete-button";
import { AppEditForm } from "~/app/[locale]/manage/apps/edit/[id]/_app-edit-form";
import { IntegrationAccessSettings } from "~/app/[locale]/manage/integrations/_components/integration-access-settings";
import { DeleteIntegrationActionButton } from "~/app/[locale]/manage/integrations/_integration-buttons";
import { EditIntegrationForm } from "~/app/[locale]/manage/integrations/edit/[id]/_integration-edit-form";
import { IntegrationNewFormWrapper } from "~/app/[locale]/manage/integrations/new/_integration-new-form-wrapper";
import { IntegrationNewSelectGrid } from "~/app/[locale]/manage/integrations/new/_integration-new-select-grid";
import { SearchEngineDeleteButton } from "~/app/[locale]/manage/search-engines/_search-engine-delete-button";
import { SearchEngineEditForm } from "~/app/[locale]/manage/search-engines/edit/[id]/_search-engine-edit-form";
import { SearchEngineNewForm } from "~/app/[locale]/manage/search-engines/new/_search-engine-new-form";
import { ManageCollectionItem, ManageCollectionPage } from "~/components/manage/manage-collection";
import { MobileAffixButton } from "~/components/manage/mobile-affix-button";
import { NoResults } from "~/components/no-results";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { useWorkerConnections, useWorkerWorkspace } from "~/worker/context";

import { WorkerQuery, WorkerQueryStatus } from "./query-state";

export interface WorkerRouteProps {
  segments: string[];
  searchParams: URLSearchParams;
}

export function workerPagination(searchParams: URLSearchParams) {
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 10);
  return {
    search: searchParams.get("search") ?? undefined,
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    pageSize: Number.isSafeInteger(pageSize) && pageSize > 0 && pageSize <= 100 ? pageSize : 10,
  };
}

export function WorkerAppsRoute({ segments, searchParams }: WorkerRouteProps) {
  if (segments[1] === "new") return <WorkerAppNew />;
  if (segments[1] === "edit" && segments[2]) return <WorkerAppEdit id={segments[2]} />;
  return <WorkerAppList searchParams={searchParams} />;
}

function WorkerAppNew() {
  const t = useI18n("app.page.create");
  return (
    <>
      <DynamicBreadcrumb />
      <Container>
        <Stack>
          <Title>{t("title")}</Title>
          <AppNewForm showBackToOverview showCreateAnother />
        </Stack>
      </Container>
    </>
  );
}

function WorkerAppEdit({ id }: { id: string }) {
  const query = clientApi.app.byId.useQuery({ id });
  const t = useI18n("app.page.edit");
  return (
    <WorkerQuery query={query}>
      {(app) => (
        <>
          <DynamicBreadcrumb dynamicMappings={new Map([[id, app.name]])} nonInteractable={["edit"]} />
          <Container>
            <Stack>
              <Title>{t("title")}</Title>
              <AppEditForm app={app} />
            </Stack>
          </Container>
        </>
      )}
    </WorkerQuery>
  );
}

function WorkerAppList({ searchParams }: { searchParams: URLSearchParams }) {
  const t = useI18n("app");
  const tCommon = useI18n("common");
  const { data: session } = useSession();
  const canCreate = session?.user.permissions.includes("app-create");
  const canManage = session?.user.permissions.includes("app-modify-all");
  const canDelete = session?.user.permissions.includes("app-full-all") ?? false;
  const input = workerPagination(searchParams);
  const query = clientApi.app.getPaginated.useQuery(input, { enabled: canManage });
  if (canManage && (query.isPending || query.error)) return <WorkerQueryStatus queries={[query]} />;
  const apps = query.data?.items ?? [];
  const totalPages = Math.ceil((query.data?.totalCount ?? 0) / input.pageSize);
  return (
    <ManageCollectionPage
      title={tCommon("entity.apps")}
      ariaLabel={t("page.list.ariaLabel")}
      itemCount={apps.length}
      emptyState={
        <NoResults
          icon={IconBox}
          title={t("page.list.noResults.title")}
          description={t("page.list.noResults.description")}
          action={{ label: t("page.list.noResults.action"), href: "/manage/apps/new", hidden: !canCreate }}
        />
      }
      primaryAction={
        canCreate && (
          <MobileAffixButton component={Link} href="/manage/apps/new">
            {t("page.create.title")}
          </MobileAffixButton>
        )
      }
      toolbar={
        canManage && (
          <SearchInput
            placeholder={`${t("search")}...`}
            ariaLabel={t("search")}
            defaultValue={input.search}
            flexExpand
          />
        )
      }
      footer={totalPages > 1 && <TablePagination total={totalPages} />}
      floatingPrimaryAction={canCreate}
    >
      {apps.map((app) => (
        <WorkerAppItem key={app.id} app={app} canDelete={canDelete} />
      ))}
    </ManageCollectionPage>
  );
}

function WorkerAppItem({
  app,
  canDelete,
}: {
  app: RouterOutputs["app"]["getPaginated"]["items"][number];
  canDelete: boolean;
}) {
  const t = useI18n("common.action");
  const href = getSafeAppHref(app.href);
  return (
    <ManageCollectionItem
      leading={<Avatar size={36} src={app.iconUrl} radius="sm" styles={{ image: { objectFit: "contain" } }} alt="" />}
      title={
        <Text component="span" fw={600} lineClamp={1}>
          {app.name}
        </Text>
      }
      description={
        app.description && (
          <Text size="sm" c="dimmed" lineClamp={2} style={{ whiteSpace: "pre-line" }}>
            {app.description}
          </Text>
        )
      }
      metadata={
        href && (
          <Anchor
            href={href}
            target="_blank"
            rel="noreferrer"
            lineClamp={1}
            size="sm"
            style={{ wordBreak: "break-all" }}
          >
            {app.href}
          </Anchor>
        )
      }
      actions={
        <ActionIconGroup>
          <ActionIcon
            component={Link}
            href={`/manage/apps/edit/${app.id}`}
            variant="subtle"
            color="gray"
            size={44}
            aria-label={t("editNamed", { name: app.name })}
          >
            <IconPencil size={18} stroke={1.5} />
          </ActionIcon>
          {canDelete && <AppDeleteButton app={app} />}
        </ActionIconGroup>
      }
    />
  );
}

export function WorkerIntegrationsRoute({ segments, searchParams }: WorkerRouteProps) {
  if (segments[1] === "new") return <WorkerIntegrationNew searchParams={searchParams} />;
  if (segments[1] === "edit" && segments[2]) return <WorkerIntegrationEdit id={segments[2]} />;
  return <WorkerIntegrationList searchParams={searchParams} />;
}

function WorkerIntegrationNew({ searchParams }: { searchParams: URLSearchParams }) {
  const t = useI18n("integration");
  const kind = integrationKinds.find((candidate) => candidate === searchParams.get("kind"));
  return (
    <>
      <DynamicBreadcrumb />
      <Container>
        <Stack>
          {kind && (
            <Group align="center">
              <IntegrationAvatar kind={kind} size="md" />
              <Title>{t("page.create.title", { name: getIntegrationName(kind) })}</Title>
            </Group>
          )}
          {!kind && <Title>{t("action.create")}</Title>}
          {kind && (
            <IntegrationNewFormWrapper
              kind={kind}
              initialUrl={searchParams.get("url") ?? undefined}
              initialName={searchParams.get("name") ?? undefined}
            />
          )}
          {!kind && <IntegrationNewSelectGrid enableMockIntegration={false} />}
        </Stack>
      </Container>
    </>
  );
}

function WorkerIntegrationEdit({ id }: { id: string }) {
  const integrationQuery = clientApi.integration.byId.useQuery({ id });
  const permissionsQuery = clientApi.integration.getIntegrationPermissions.useQuery({ id });
  const t = useI18n();
  if (!integrationQuery.data || !permissionsQuery.data)
    return <WorkerQueryStatus queries={[integrationQuery, permissionsQuery]} />;
  const integration = integrationQuery.data;
  return (
    <>
      <DynamicBreadcrumb dynamicMappings={new Map([[id, integration.name]])} nonInteractable={["edit"]} />
      <Container>
        <Stack>
          <Group align="center">
            <IntegrationAvatar kind={integration.kind} size="md" />
            <Title>{t("integration.page.edit.title", { name: getIntegrationName(integration.kind) })}</Title>
          </Group>
          {integration.origin && <WorkerIntegrationOrigin origin={integration.origin} />}
          {!integration.origin && <EditIntegrationForm integration={integration} />}
          <Title order={2}>{t("permission.title")}</Title>
          <Fieldset>
            <IntegrationAccessSettings integration={integration} initialPermissions={permissionsQuery.data} />
          </Fieldset>
        </Stack>
      </Container>
    </>
  );
}

function WorkerIntegrationOrigin({ origin }: { origin: NonNullable<RouterOutputs["integration"]["byId"]["origin"]> }) {
  const { pool, manageWorkers } = useWorkerWorkspace();
  const snapshot = useWorkerConnections();
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const canOpen = snapshot.workers.some(({ worker }) => worker.workerId === origin.workerId);
  async function openSource() {
    setBusy(true);
    setError("");
    try {
      await pool.restore(origin.workerId);
      pool.setPrimary(origin.workerId);
      router.push(`/manage/integrations/edit/${encodeURIComponent(origin.integrationId)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to open the source worker.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Stack gap="sm">
      <Alert>
        This integration belongs to {origin.workerName}. Its credentials and connection settings are managed on that
        worker.
      </Alert>
      {error && (
        <Alert color="red" role="alert">
          {error}
        </Alert>
      )}
      {canOpen && (
        <Button variant="light" loading={busy} onClick={() => void openSource()}>
          Open settings on {origin.workerName}
        </Button>
      )}
      {!canOpen && (
        <Button variant="light" onClick={manageWorkers}>
          Connect to {origin.workerName}
        </Button>
      )}
    </Stack>
  );
}

function WorkerIntegrationList({ searchParams }: { searchParams: URLSearchParams }) {
  const query = clientApi.integration.all.useQuery();
  const t = useI18n("integration");
  const tCommon = useI18n("common");
  const { data: session } = useSession();
  const canCreate = session?.user.permissions.includes("integration-create");
  const globalAccess = session?.user.permissions.includes("integration-full-all");
  const search = searchParams.get("search") ?? "";
  return (
    <WorkerQuery query={query}>
      {(integrations) => {
        const term = search.trim().toLocaleLowerCase();
        const filtered = integrations
          .filter(
            (integration) =>
              (globalAccess || integration.permissions.hasFullAccess) &&
              [
                integration.name,
                getIntegrationName(integration.kind),
                integration.url,
                integration.origin?.workerName ?? "",
              ].some((value) => value.toLocaleLowerCase().includes(term)),
          )
          .toSorted(
            (a, b) =>
              getIntegrationName(a.kind).localeCompare(getIntegrationName(b.kind)) || a.name.localeCompare(b.name),
          );
        return (
          <ManageCollectionPage
            title={tCommon("entity.integrations")}
            ariaLabel={t("page.list.ariaLabel")}
            itemCount={filtered.length}
            emptyState={
              <NoResults
                icon={IconPlugX}
                title={t("page.list.noResults.title")}
                description={t("page.list.noResults.description")}
                action={{
                  label: t("page.list.noResults.action"),
                  href: "/manage/integrations/new",
                  hidden: !canCreate,
                }}
              />
            }
            primaryAction={
              canCreate && (
                <MobileAffixButton component={Link} href="/manage/integrations/new">
                  {t("action.create")}
                </MobileAffixButton>
              )
            }
            toolbar={
              <Stack>
                <SearchInput
                  placeholder={`${t("page.list.search")}...`}
                  ariaLabel={t("page.list.search")}
                  defaultValue={search}
                  flexExpand
                />
              </Stack>
            }
            floatingPrimaryAction={canCreate}
          >
            {filtered.map((integration) => (
              <WorkerIntegrationItem key={integration.id} integration={integration} />
            ))}
          </ManageCollectionPage>
        );
      }}
    </WorkerQuery>
  );
}

function WorkerIntegrationItem({ integration }: { integration: RouterOutputs["integration"]["all"][number] }) {
  const t = useI18n("common.action");
  let href: string | undefined;
  if (!integration.origin) href = getSafeApplicationUrl(integration.url);
  return (
    <ManageCollectionItem
      leading={<IntegrationAvatar kind={integration.kind} size="md" radius="sm" />}
      title={
        <Text component="span" fw={600} lineClamp={1}>
          {integration.name}
        </Text>
      }
      badges={
        <Group gap="xs">
          <Badge size="sm" variant="light">
            {getIntegrationName(integration.kind)}
          </Badge>
          {integration.origin && (
            <Badge size="sm" color="cyan" variant="light">
              {integration.origin.workerName}
            </Badge>
          )}
        </Group>
      }
      metadata={
        href && (
          <Anchor
            href={href}
            target="_blank"
            rel="noreferrer"
            lineClamp={1}
            size="sm"
            style={{ wordBreak: "break-all" }}
          >
            {integration.url}
          </Anchor>
        )
      }
      actions={
        <ActionIconGroup>
          <ActionIcon
            component={Link}
            href={`/manage/integrations/edit/${integration.id}`}
            variant="subtle"
            color="gray"
            size={44}
            aria-label={t("editNamed", { name: integration.name })}
          >
            <IconPencil size={18} stroke={1.5} />
          </ActionIcon>
          <DeleteIntegrationActionButton integration={integration} />
        </ActionIconGroup>
      }
    />
  );
}

export function WorkerSearchEnginesRoute({ segments, searchParams }: WorkerRouteProps) {
  if (segments[1] === "new") return <WorkerSearchEngineNew />;
  if (segments[1] === "edit" && segments[2]) return <WorkerSearchEngineEdit id={segments[2]} />;
  return <WorkerSearchEngineList searchParams={searchParams} />;
}

function WorkerSearchEngineNew() {
  const t = useI18n("search.engine.page.create");
  return (
    <>
      <DynamicBreadcrumb />
      <Container>
        <Stack>
          <Title>{t("title")}</Title>
          <SearchEngineNewForm />
        </Stack>
      </Container>
    </>
  );
}

function WorkerSearchEngineEdit({ id }: { id: string }) {
  const query = clientApi.searchEngine.byId.useQuery({ id });
  const t = useI18n("search.engine.page.edit");
  return (
    <WorkerQuery query={query}>
      {(searchEngine) => (
        <>
          <DynamicBreadcrumb dynamicMappings={new Map([[id, searchEngine.name]])} nonInteractable={["edit"]} />
          <Container>
            <Stack>
              <Title>{t("title")}</Title>
              <SearchEngineEditForm searchEngine={searchEngine} />
            </Stack>
          </Container>
        </>
      )}
    </WorkerQuery>
  );
}

function WorkerSearchEngineList({ searchParams }: { searchParams: URLSearchParams }) {
  const input = workerPagination(searchParams);
  const query = clientApi.searchEngine.getPaginated.useQuery(input);
  const t = useI18n("search.engine");
  const tCommon = useI18n("common");
  const { data: session } = useSession();
  const canCreate = session?.user.permissions.includes("search-engine-create");
  const canModify = session?.user.permissions.includes("search-engine-modify-all");
  const canDelete = session?.user.permissions.includes("search-engine-full-all");
  return (
    <WorkerQuery query={query}>
      {({ items, totalCount }) => (
        <ManageCollectionPage
          title={tCommon("entity.searchEngines")}
          ariaLabel={t("page.list.ariaLabel")}
          itemCount={items.length}
          emptyState={
            <NoResults
              icon={IconSearch}
              title={t("page.list.noResults.title")}
              description={t("page.list.noResults.description")}
              action={{
                label: t("page.list.noResults.action"),
                href: "/manage/search-engines/new",
                hidden: !canCreate,
              }}
            />
          }
          primaryAction={
            canCreate && (
              <MobileAffixButton component={Link} href="/manage/search-engines/new">
                {t("page.create.title")}
              </MobileAffixButton>
            )
          }
          toolbar={
            <SearchInput
              placeholder={`${t("search")}...`}
              ariaLabel={t("search")}
              defaultValue={input.search}
              flexExpand
            />
          }
          footer={totalCount > input.pageSize && <TablePagination total={Math.ceil(totalCount / input.pageSize)} />}
          floatingPrimaryAction={canCreate}
        >
          {items.map((searchEngine) => (
            <ManageCollectionItem
              key={searchEngine.id}
              leading={
                <Avatar
                  size={36}
                  src={searchEngine.iconUrl}
                  radius="sm"
                  styles={{ image: { objectFit: "contain" } }}
                  alt=""
                />
              }
              title={
                <Text component="span" fw={600} lineClamp={1}>
                  {searchEngine.name}
                </Text>
              }
              badges={
                <Badge size="sm" variant="light">
                  {t(`page.list.type.${searchEngine.type}`)}
                </Badge>
              }
              description={
                searchEngine.description && (
                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {searchEngine.description}
                  </Text>
                )
              }
              metadata={
                searchEngine.urlTemplate && (
                  <Text size="sm" c="dimmed" lineClamp={1}>
                    {searchEngine.urlTemplate}
                  </Text>
                )
              }
              actions={
                <ActionIconGroup>
                  {canModify && (
                    <ActionIcon
                      component={Link}
                      href={`/manage/search-engines/edit/${searchEngine.id}`}
                      variant="subtle"
                      color="gray"
                      size={44}
                      aria-label={tCommon("action.editNamed", { name: searchEngine.name })}
                    >
                      <IconPencil size={18} stroke={1.5} />
                    </ActionIcon>
                  )}
                  {canDelete && <SearchEngineDeleteButton searchEngine={searchEngine} />}
                </ActionIconGroup>
              }
            />
          ))}
        </ManageCollectionPage>
      )}
    </WorkerQuery>
  );
}
