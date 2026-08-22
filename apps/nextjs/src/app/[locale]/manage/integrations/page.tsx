import { notFound, redirect } from "next/navigation";
import { ActionIcon, ActionIconGroup, Anchor, Badge, Stack, Text } from "@mantine/core";
import { IconPencil, IconPlugX } from "@tabler/icons-react";
import { z } from "zod/v4";

import type { RouterOutputs } from "@homarr/api";
import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getSafeApplicationUrl } from "@homarr/common";
import { getIntegrationName } from "@homarr/definitions";
import { getI18n } from "@homarr/translation/server";
import { IntegrationAvatar, Link, SearchInput } from "@homarr/ui";

import { TourTarget } from "~/components/layout/header/tour-target";
import { ManageCollectionItem, ManageCollectionPage } from "~/components/manage/manage-collection";
import { MobileAffixButton } from "~/components/manage/mobile-affix-button";
import { NoResults } from "~/components/no-results";
import { getIntegrationsSectionAccess } from "../_access";
import { DeleteIntegrationActionButton } from "./_integration-buttons";

const searchParamsSchema = z.object({ search: z.string().optional() });

interface IntegrationsPageProps {
  searchParams: Promise<z.infer<typeof searchParamsSchema>>;
}

export default async function IntegrationsPage(props: IntegrationsPageProps) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const searchParams = searchParamsSchema.parse(await props.searchParams);
  const integrations = await api.integration.all();
  const {
    canManageAll: hasGlobalFullAccess,
    canCreate,
    canAccess,
  } = getIntegrationsSectionAccess(session, integrations);
  if (!canAccess) notFound();

  const t = await getI18n("integration");
  const tCommon = await getI18n("common");
  // Without integration-full-all only the integrations that were explicitly delegated to the user
  // are manageable, so the list never shows an integration they cannot open.
  const manageableIntegrations = integrations.filter(
    (integration) => hasGlobalFullAccess || integration.permissions.hasFullAccess,
  );

  const query = searchParams.search?.trim().toLocaleLowerCase() ?? "";
  const filteredIntegrations = manageableIntegrations
    .filter((integration) => {
      if (!query) return true;
      return [integration.name, getIntegrationName(integration.kind), integration.url].some((value) =>
        value.toLocaleLowerCase().includes(query),
      );
    })
    .toSorted(
      (integrationA, integrationB) =>
        getIntegrationName(integrationA.kind).localeCompare(getIntegrationName(integrationB.kind)) ||
        integrationA.name.localeCompare(integrationB.name),
    );
  const hasSearch = query.length > 0;

  const page = (
    <ManageCollectionPage
      title={tCommon("entity.integrations")}
      ariaLabel={t("page.list.ariaLabel")}
      itemCount={filteredIntegrations.length}
      emptyState={
        manageableIntegrations.length === 0 && !hasGlobalFullAccess ? (
          <NoResults
            icon={IconPlugX}
            title={t("page.list.noResults.createOnlyTitle")}
            description={t("page.list.noResults.createOnlyDescription")}
            action={{ label: t("page.list.noResults.action"), href: "/manage/integrations/new" }}
          />
        ) : hasSearch ? (
          <NoResults
            icon={IconPlugX}
            title={t("page.list.noResults.filteredTitle")}
            description={t("page.list.noResults.filteredDescription", { search: searchParams.search ?? "" })}
            action={{ label: tCommon("action.clearSearch"), href: "/manage/integrations" }}
          />
        ) : (
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
        )
      }
      primaryAction={
        canCreate ? (
          <TourTarget id="manage-integrations-create">
            <MobileAffixButton component={Link} href="/manage/integrations/new">
              {t("action.create")}
            </MobileAffixButton>
          </TourTarget>
        ) : undefined
      }
      toolbar={
        <SearchInput
          placeholder={`${t("page.list.search")}...`}
          ariaLabel={t("page.list.search")}
          defaultValue={searchParams.search}
          flexExpand
        />
      }
      floatingPrimaryAction={canCreate}
    >
      {filteredIntegrations.map((integration) => (
        <IntegrationItem key={integration.id} integration={integration} />
      ))}
    </ManageCollectionPage>
  );

  const pageContent =
    filteredIntegrations.length > 0 ? <TourTarget id="manage-integrations-list">{page}</TourTarget> : page;

  if (hasGlobalFullAccess) {
    return pageContent;
  }

  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        {t("page.list.scopedNote")}
      </Text>
      {pageContent}
    </Stack>
  );
}

interface IntegrationItemProps {
  integration: RouterOutputs["integration"]["all"][number];
}

const IntegrationItem = async ({ integration }: IntegrationItemProps) => {
  const tCommon = await getI18n("common");
  const kindName = getIntegrationName(integration.kind);
  const safeUrl = getSafeApplicationUrl(integration.url);

  return (
    <ManageCollectionItem
      leading={<IntegrationAvatar kind={integration.kind} size="md" radius="sm" />}
      title={
        <Text component="span" fw={600} lineClamp={1}>
          {integration.name}
        </Text>
      }
      badges={
        <Badge size="sm" variant="light">
          {kindName}
        </Badge>
      }
      metadata={
        safeUrl ? (
          <Anchor
            href={safeUrl}
            target="_blank"
            rel="noreferrer"
            lineClamp={1}
            size="sm"
            style={{ wordBreak: "break-all" }}
          >
            {integration.url}
          </Anchor>
        ) : undefined
      }
      actions={
        <ActionIconGroup>
          <ActionIcon
            component={Link}
            href={`/manage/integrations/edit/${integration.id}`}
            variant="subtle"
            color="gray"
            size={44}
            aria-label={tCommon("action.editNamed", { name: integration.name })}
          >
            <IconPencil size={18} stroke={1.5} />
          </ActionIcon>
          <DeleteIntegrationActionButton integration={integration} />
        </ActionIconGroup>
      }
    />
  );
};
