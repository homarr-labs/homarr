import { Fragment } from "react";
import type { ReactNode } from "react";
import { ActionIcon, ActionIconGroup, Anchor, Avatar, Button, Card, Stack, Text } from "@mantine/core";
import { IconBox, IconPencil, IconTrash } from "@tabler/icons-react";

import { getSafeAppHref } from "@homarr/common/url";
import { useI18n } from "@homarr/translation/standalone/client";
import { InlineConfirmActionIcon, Link, SearchInput, TablePagination } from "@homarr/ui";

import type { AppDisplay, AppsManagementPresentation } from "./contracts";

export interface SourceAppsManagementProps {
  presentation: AppsManagementPresentation;
  apps: readonly AppDisplay[];
  totalPages: number;
  search?: string;
  canManageAll: boolean;
  canCreate: boolean;
  readOnly: boolean;
  feedback?: ReactNode;
  renderDeleteAction: (app: AppDisplay) => ReactNode;
}

export function SourceAppsManagement({
  presentation,
  apps,
  totalPages,
  search,
  canManageAll,
  canCreate,
  readOnly,
  feedback,
  renderDeleteAction,
}: SourceAppsManagementProps) {
  const t = useI18n("app");
  const tCommon = useI18n("common");
  const { CollectionPage, MobilePrimaryAction, tourTarget } = presentation;
  let emptyState = (
    <SourceAppsNoResults
      title={t("page.list.noResults.title")}
      description={t("page.list.noResults.description")}
      action={{ label: t("page.list.noResults.action"), href: "/manage/apps/new", hidden: !canCreate || readOnly }}
    />
  );
  if (!canManageAll) {
    emptyState = (
      <SourceAppsNoResults
        title={t("page.list.noResults.createOnlyTitle")}
        description={t("page.list.noResults.createOnlyDescription")}
        action={{ label: t("page.list.noResults.action"), href: "/manage/apps/new", hidden: readOnly }}
      />
    );
  } else if (search?.trim()) {
    emptyState = (
      <SourceAppsNoResults
        title={t("page.list.noResults.filteredTitle")}
        description={t("page.list.noResults.filteredDescription", { search })}
        action={{ label: tCommon("action.clearSearch"), href: "/manage/apps" }}
      />
    );
  }
  const createAction = (
    <MobilePrimaryAction
      actionButtonMinWidth={presentation.actionButtonMinWidth}
      affixPosition={presentation.affixPosition}
    >
      <Button component={Link} href="/manage/apps/new" disabled={readOnly}>
        {t("page.create.title")}
      </Button>
    </MobilePrimaryAction>
  );
  const page = (
    <CollectionPage
      title={tCommon("entity.apps")}
      breadcrumb={presentation.breadcrumb}
      floatingActionBottomOffset={presentation.floatingActionBottomOffset}
      ariaLabel={t("page.list.ariaLabel")}
      itemCount={apps.length}
      emptyState={feedback ?? emptyState}
      primaryAction={canCreate ? (tourTarget?.("manage-apps-create", createAction) ?? createAction) : undefined}
      toolbar={
        canManageAll ? (
          <SearchInput placeholder={`${t("search")}...`} ariaLabel={t("search")} defaultValue={search} flexExpand />
        ) : undefined
      }
      footer={totalPages > 1 ? <TablePagination total={totalPages} /> : undefined}
      floatingPrimaryAction={canCreate}
    >
      {apps.map((app) => (
        <SourceAppManagementItem
          key={app.id}
          presentation={presentation}
          app={app}
          readOnly={readOnly}
          deleteAction={renderDeleteAction(app)}
        />
      ))}
    </CollectionPage>
  );
  if (apps.length > 0 && tourTarget) return tourTarget("manage-apps-list", page);
  return page;
}

export function SourceAppManagementItem({
  presentation,
  app,
  readOnly,
  deleteAction,
}: {
  presentation: AppsManagementPresentation;
  app: AppDisplay;
  readOnly: boolean;
  deleteAction?: ReactNode;
}) {
  const tCommon = useI18n("common");
  const { CollectionItem } = presentation;
  const descriptionLines = app.description?.split("\n");
  const safeHref = getSafeAppHref(app.href);
  return (
    <CollectionItem
      leading={<Avatar size={36} src={app.iconUrl} radius="sm" styles={{ image: { objectFit: "contain" } }} alt="" />}
      title={
        <Text component="span" fw={600} lineClamp={1}>
          {app.name}
        </Text>
      }
      description={
        descriptionLines ? (
          <Text size="sm" c="dimmed" lineClamp={2}>
            {descriptionLines.map((line, index) => (
              <Fragment key={index}>
                {line}
                {index < descriptionLines.length - 1 && <br />}
              </Fragment>
            ))}
          </Text>
        ) : undefined
      }
      metadata={
        safeHref ? (
          <Anchor
            href={safeHref}
            target="_blank"
            rel="noreferrer"
            lineClamp={1}
            size="sm"
            style={{ wordBreak: "break-all" }}
          >
            {app.href}
          </Anchor>
        ) : undefined
      }
      actions={
        <ActionIconGroup>
          <ActionIcon
            component={Link}
            href={`/manage/apps/edit/${app.id}`}
            variant="subtle"
            color="gray"
            size={44}
            disabled={readOnly}
            aria-label={tCommon("action.editNamed", { name: app.name })}
          >
            <IconPencil size={18} stroke={1.5} />
          </ActionIcon>
          {deleteAction}
        </ActionIconGroup>
      }
    />
  );
}

export function SourceAppsNoResults({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: { label: string; href: string; hidden?: boolean };
}) {
  return (
    <Card bg="transparent" withBorder={false}>
      <Stack align="center" gap="sm">
        <IconBox size="2rem" />
        <Text fw={500} size="lg">
          {title}
        </Text>
        {description && (
          <Text c="dimmed" ta="center" maw={560}>
            {description}
          </Text>
        )}
        {action && !action.hidden && (
          <Anchor component={Link} href={action.href}>
            {action.label}
          </Anchor>
        )}
      </Stack>
    </Card>
  );
}

export function SourceAppDeleteButton({
  app,
  onConfirm,
  disabled = false,
  loading = false,
}: {
  app: AppDisplay;
  onConfirm?: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
}) {
  const tCommon = useI18n("common");
  return (
    <InlineConfirmActionIcon
      confirmLabel={tCommon("action.confirm")}
      confirmationAriaLabel={tCommon("action.confirm")}
      onConfirm={async () => {
        if (!onConfirm || disabled) throw new Error("App deletion is unavailable");
        await onConfirm();
      }}
      loading={loading}
      disabled={disabled || !onConfirm}
      variant="subtle"
      color="red"
      size={44}
      aria-label={tCommon("action.deleteNamed", { name: app.name })}
    >
      <IconTrash color="red" size={16} stroke={1.5} />
    </InlineConfirmActionIcon>
  );
}
