import { useState } from "react";
import {
  ActionIcon,
  Anchor,
  Avatar,
  Badge,
  Button,
  Container,
  Group,
  Pagination,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconCheck, IconPencil, IconSearch, IconTrash, IconX } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { getIntegrationManagementAccess, getIntegrationName, getIconUrl } from "@homarr/definitions";
import { getSafeApplicationUrl } from "@homarr/common/url";
import { useI18n } from "@homarr/translation/standalone/client";

import type { IntegrationListItem } from "./client";
import { IntegrationAccessDenied, IntegrationLoadError, IntegrationLoading } from "./feedback";
import {
  useIntegrationAction,
  useIntegrationFeature,
  useIntegrationQueryKey,
  useInvalidateIntegrations,
} from "./provider";
import { IntegrationActionHold } from "../../source-ui/integrations";
import { useIntegrationRequestGeneration } from "./request-generation";
import classes from "./integrations.module.css";

export function IntegrationListPage({
  initialSearch = "",
  initialPage = 1,
  pageSize = 20,
}: {
  initialSearch?: string;
  initialPage?: number;
  pageSize?: number;
}) {
  const t = useI18n();
  const { client, principal, readOnly } = useIntegrationFeature();
  const deleteAvailability = useIntegrationAction("delete");
  const key = useIntegrationQueryKey();
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(Math.max(1, initialPage));
  const query = useQuery({
    queryKey: [...key, "all"],
    queryFn: ({ signal }) => client.integration.all(undefined, { signal }),
    enabled: principal.kind === "authenticated",
    retry: false,
  });
  if (principal.kind !== "authenticated") return <IntegrationAccessDenied />;
  if (query.isPending) return <IntegrationLoading />;
  if (query.isError) return <IntegrationLoadError retry={() => void query.refetch()} />;
  const access = getIntegrationManagementAccess(
    principal.user.permissions,
    query.data.some((item) => item.permissions.hasFullAccess),
  );
  if (!access.canAccess) return <IntegrationAccessDenied />;
  const manageable = query.data.filter((item) => access.canManageAll || item.permissions.hasFullAccess);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filtered = manageable
    .filter((item) =>
      [item.name, getIntegrationName(item.kind), item.url].some((value) =>
        value.toLocaleLowerCase().includes(normalizedSearch),
      ),
    )
    .toSorted(
      (left, right) =>
        getIntegrationName(left.kind).localeCompare(getIntegrationName(right.kind)) ||
        left.name.localeCompare(right.name),
    );
  const size = Math.max(1, Math.floor(pageSize));
  const totalPages = Math.max(1, Math.ceil(filtered.length / size));
  const activePage = Math.min(page, totalPages);
  const emptyKey = normalizedSearch ? "filtered" : manageable.length === 0 && !access.canManageAll ? "createOnly" : "";
  const titleKey = emptyKey ? (`${emptyKey}Title` as const) : "title";
  const descriptionKey = emptyKey ? (`${emptyKey}Description` as const) : "description";

  return (
    <Container size="xl">
      <Stack>
        <IntegrationActionHold availability={deleteAvailability} />
        {!access.canManageAll && (
          <Text size="sm" c="dimmed">
            {t("integration.page.list.scopedNote")}
          </Text>
        )}
        <Group justify="space-between">
          <Title>{t("common.entity.integrations")}</Title>
          {access.canCreate && (
            <Button component="a" href="/manage/integrations/new" disabled={readOnly}>
              {t("integration.action.create")}
            </Button>
          )}
        </Group>
        <TextInput
          leftSection={<IconSearch size={16} />}
          value={search}
          placeholder={`${t("integration.page.list.search")}...`}
          aria-label={t("integration.page.list.search")}
          onChange={(event) => {
            setSearch(event.currentTarget.value);
            setPage(1);
          }}
        />
        {filtered.length === 0 ? (
          <Stack align="center" py="xl">
            <Title order={2}>{t(`integration.page.list.noResults.${titleKey}`)}</Title>
            <Text c="dimmed" ta="center">
              {t(`integration.page.list.noResults.${descriptionKey}`, { search })}
            </Text>
            {normalizedSearch ? (
              <Button
                variant="default"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
              >
                {t("common.action.clearSearch")}
              </Button>
            ) : (
              access.canCreate && (
                <Button component="a" href="/manage/integrations/new" disabled={readOnly}>
                  {t("integration.page.list.noResults.action")}
                </Button>
              )
            )}
          </Stack>
        ) : (
          <Stack
            component="ul"
            aria-label={t("integration.page.list.ariaLabel")}
            gap="sm"
            m={0}
            p={0}
            style={{ listStyle: "none" }}
          >
            {filtered.slice((activePage - 1) * size, activePage * size).map((item) => (
              <IntegrationRow key={item.id} integration={item} />
            ))}
          </Stack>
        )}
        {totalPages > 1 && (
          <Group justify="center">
            <Pagination
              total={totalPages}
              value={activePage}
              onChange={setPage}
              getControlProps={(control) => ({
                "aria-label": t(
                  control === "previous" || control === "first" ? "common.action.previous" : "common.action.next",
                ),
              })}
            />
          </Group>
        )}
      </Stack>
    </Container>
  );
}

function IntegrationRow({ integration }: { integration: IntegrationListItem }) {
  const t = useI18n();
  const { client, readOnly, notify } = useIntegrationFeature();
  const availability = useIntegrationAction("delete");
  const held = availability.state === "held";
  const invalidate = useInvalidateIntegrations();
  const requests = useIntegrationRequestGeneration();
  const [confirming, setConfirming] = useState(false);
  const mutation = useMutation({
    mutationFn: ({ id }: { id: string; generation: number }) => client.integration.delete({ id }),
    retry: false,
    onSuccess: (_, { generation }) => {
      void invalidate();
      if (!requests.isCurrent(generation)) return;
      notify({
        color: "green",
        title: t("common.notification.delete.success"),
        message: t("integration.page.delete.notification.success.message"),
      });
    },
    onError: (_, { generation }) => {
      if (!requests.isCurrent(generation)) return;
      notify({
        color: "red",
        title: t("common.notification.delete.error"),
        message: t("integration.page.delete.notification.error.message"),
      });
    },
  });
  const safeUrl = getSafeApplicationUrl(integration.url);
  return (
    <Paper component="li" p="sm" withBorder radius="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
        <Avatar src={getIconUrl(integration.kind)} size="md" radius="sm" />
        <Stack gap={4} flex={1} miw={0}>
          <Group gap="xs">
            <Text component="span" fw={600} lineClamp={1}>
              {integration.name}
            </Text>
            <Badge size="sm" variant="light">
              {getIntegrationName(integration.kind)}
            </Badge>
          </Group>
          {safeUrl && (
            <Anchor
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              lineClamp={1}
              size="sm"
              className={classes.url}
            >
              {integration.url}
            </Anchor>
          )}
        </Stack>
        <Group gap={4} wrap="nowrap">
          <ActionIcon
            component="a"
            href={`/manage/integrations/edit/${encodeURIComponent(integration.id)}`}
            variant="subtle"
            color="gray"
            size={44}
            aria-label={t("common.action.editNamed", { name: integration.name })}
          >
            <IconPencil size={18} stroke={1.5} />
          </ActionIcon>
          {confirming ? (
            <>
              <Tooltip label={t("integration.page.delete.message", { name: integration.name })} opened>
                <ActionIcon
                  color="red"
                  variant="subtle"
                  size={44}
                  disabled={readOnly || held}
                  loading={mutation.isPending}
                  aria-label={t("common.action.confirm")}
                  onClick={() => {
                    if (!readOnly && !held && !mutation.isPending)
                      mutation.mutate({ id: integration.id, generation: requests.begin() });
                  }}
                >
                  <IconCheck size={18} />
                </ActionIcon>
              </Tooltip>
              <ActionIcon
                size={44}
                variant="subtle"
                color="gray"
                disabled={mutation.isPending}
                aria-label={t("common.action.cancel")}
                onClick={() => setConfirming(false)}
              >
                <IconX size={18} />
              </ActionIcon>
            </>
          ) : (
            <ActionIcon
              variant="subtle"
              color="red"
              size={44}
              disabled={readOnly || held}
              aria-label={t("common.action.deleteNamed", { name: integration.name })}
              onClick={() => setConfirming(true)}
            >
              <IconTrash size={16} stroke={1.5} />
            </ActionIcon>
          )}
        </Group>
      </Group>
    </Paper>
  );
}
