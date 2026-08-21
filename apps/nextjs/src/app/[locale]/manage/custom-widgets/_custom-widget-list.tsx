"use client";

import { Avatar, Badge, Button, Group, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertTriangle, IconApi, IconPencil, IconSparkles } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

import { CustomWidgetSourceSetupDialog } from "~/components/custom-widgets/custom-widget-source-setup-dialog";
import { ManageCollectionItem, ManageCollectionList } from "~/components/manage/manage-collection";
import { NoResults } from "~/components/no-results";
import { CustomWidgetRowActions } from "./_custom-widget-actions";

interface CustomWidgetListProps {
  definitions: RouterOutputs["customWidget"]["list"];
}

export const CustomWidgetList = ({ definitions }: CustomWidgetListProps) => {
  const t = useI18n("customWidget");
  const tCommon = useI18n("common");
  const tEntities = useI18n("common.entity");

  if (definitions.length === 0) {
    return (
      <NoResults
        icon={IconApi}
        title={t("page.list.noResults")}
        action={{ href: "/manage/custom-widgets/new", label: tCommon("action.create") }}
      />
    );
  }

  return (
    <ManageCollectionList ariaLabel={tEntities("customWidgets")}>
      {definitions.map((definition) => (
        <CustomWidgetRow key={definition.id} widget={definition} />
      ))}
    </ManageCollectionList>
  );
};

type WidgetDef = RouterOutputs["customWidget"]["list"][number];

function CustomWidgetRow({ widget }: { widget: WidgetDef }) {
  const t = useI18n("customWidget");
  const tCommon = useI18n("common");
  const [sourceSetupOpened, sourceSetupControls] = useDisclosure(false);
  const origins = [...new Set(widget.sources.map((source) => source.origin))];

  return (
    <>
      <ManageCollectionItem
        leading={
          <Avatar
            size={40}
            radius="sm"
            src={widget.iconUrl}
            color={widget.valid ? "pink" : "red"}
            styles={{ image: { objectFit: "contain" } }}
            alt=""
          >
            <IconApi size={20} stroke={1.5} />
          </Avatar>
        }
        title={
          <Text component="span" fw={600} lineClamp={1} c={widget.enabled || !widget.valid ? undefined : "dimmed"}>
            {widget.name}
          </Text>
        }
        badges={<CustomWidgetStatusBadges widget={widget} onConfigureSources={sourceSetupControls.open} />}
        description={
          <Text size="sm" c="dimmed" lineClamp={2}>
            {widget.description || t("page.list.noDescription")}
          </Text>
        }
        metadata={
          <Group gap={6} wrap="wrap">
            <Text size="xs" c="dimmed">
              {t("page.list.requestCount", { count: widget.requestCount })}
            </Text>
            {origins.map((origin) => (
              <Text key={origin} size="xs" c="dimmed" ff="monospace" style={{ wordBreak: "break-all" }}>
                · {origin}
              </Text>
            ))}
          </Group>
        }
        actions={
          <Group gap="xs" wrap="nowrap">
            {widget.valid && (
              <Button
                component={Link}
                href={`/manage/custom-widgets/edit/${widget.id}`}
                variant="default"
                size="sm"
                leftSection={<IconPencil size={16} stroke={1.5} />}
              >
                {tCommon("action.edit")}
              </Button>
            )}
            <CustomWidgetRowActions
              widget={{
                id: widget.id,
                name: widget.name,
                enabled: widget.enabled,
                valid: widget.valid,
                migrationRequired: widget.migrationRequired,
              }}
            />
          </Group>
        }
        actionsAlignment="center"
      />
      {widget.valid && (
        <CustomWidgetSourceSetupDialog
          definitionId={widget.id}
          opened={sourceSetupOpened}
          onClose={sourceSetupControls.close}
        />
      )}
    </>
  );
}

/** Everything that decides whether this widget can actually run right now. */
function CustomWidgetStatusBadges({ widget, onConfigureSources }: { widget: WidgetDef; onConfigureSources(): void }) {
  const t = useI18n("customWidget");

  if (widget.migrationRequired) {
    return (
      <Tooltip label={t("page.list.migrationInstructions")} multiline maw={420}>
        <Badge color="yellow" size="sm" variant="light" leftSection={<IconSparkles size={12} />}>
          {t("page.list.migrationRequired")}
        </Badge>
      </Tooltip>
    );
  }

  if (!widget.valid) {
    return (
      <Tooltip
        label={widget.validationIssues
          .map((issue) => (issue.path ? `${issue.path}: ${issue.message}` : issue.message))
          .join("\n")}
        multiline
        maw={520}
      >
        <Badge color="red" size="sm" variant="light" leftSection={<IconAlertTriangle size={12} />}>
          {t("page.list.invalidDefinition")}
        </Badge>
      </Tooltip>
    );
  }

  return (
    <Group gap={6} wrap="nowrap">
      {widget.enabled ? (
        <Badge color="green" size="sm" variant="light">
          {t("page.list.enabled")}
        </Badge>
      ) : (
        <Tooltip label={t("page.list.disabledDescription")}>
          <Badge color="gray" size="sm" variant="light">
            {t("page.list.disabled")}
          </Badge>
        </Tooltip>
      )}
      {widget.missingSecrets.length > 0 && (
        <Tooltip
          label={t("page.list.missingCredentialsDescription", { count: widget.missingSecrets.length })}
          multiline
          maw={320}
        >
          <UnstyledButton onClick={onConfigureSources} aria-label={t("action.configureSources")}>
            <Badge
              color="yellow"
              size="sm"
              variant="light"
              leftSection={<IconAlertTriangle size={12} />}
              style={{ cursor: "pointer" }}
            >
              {t("page.list.missingCredentials", { count: widget.missingSecrets.length })}
            </Badge>
          </UnstyledButton>
        </Tooltip>
      )}
    </Group>
  );
}
