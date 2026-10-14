import { useState } from "react";
import { Anchor, Avatar, Badge, Button, Group, Select, Stack, Table, Tabs, Text } from "@mantine/core";
import {
  IconPlayerPlay,
  IconSelector,
  IconSettings,
  IconUser,
  IconUserDown,
  IconUsersGroup,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";

import type { IntegrationPermission } from "@homarr/definitions";
import { getPermissionsWithChildren, integrationPermissions, integrationPermissionsMap } from "@homarr/definitions";
import { integrationSavePermissionsSchema } from "@homarr/validation/integration";
import { useI18n } from "@homarr/translation/standalone/client";

import type { IntegrationFeatureClient, IntegrationGrants } from "./client";
import { IntegrationAccessDenied, IntegrationLoadError, IntegrationLoading } from "./feedback";
import {
  useIntegrationAction,
  useIntegrationFeature,
  useIntegrationQueryKey,
  useInvalidateIntegrations,
} from "./provider";
import { IntegrationActionHold } from "../../source-ui/integrations";
import { useIntegrationRequestGeneration } from "./request-generation";

type Grant = Parameters<
  IntegrationFeatureClient["integration"]["saveUserIntegrationPermissions"]
>[0]["permissions"][number];
type PrincipalOption = { id: string; name: string | null; image?: string | null; email?: string | null };

export function IntegrationAccessSettings({ integrationId }: { integrationId: string }) {
  return <IntegrationAccessSettingsContent key={integrationId} integrationId={integrationId} />;
}

function IntegrationAccessSettingsContent({ integrationId }: { integrationId: string }) {
  const t = useI18n();
  const { client, principal } = useIntegrationFeature();
  const key = useIntegrationQueryKey();
  const query = useQuery({
    queryKey: [...key, "permissions", integrationId],
    queryFn: ({ signal }) => client.integration.getIntegrationPermissions({ id: integrationId }, { signal }),
    enabled: principal.kind === "authenticated",
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const [userCount, setUserCount] = useState<number | null>(null);
  const [groupCount, setGroupCount] = useState<number | null>(null);
  if (principal.kind !== "authenticated") return <IntegrationAccessDenied />;
  if (query.isPending) return <IntegrationLoading />;
  if (query.isError) return <IntegrationLoadError retry={() => void query.refetch()} />;
  return (
    <Tabs color="red" defaultValue="user" keepMounted>
      <Tabs.List grow>
        <Tabs.Tab value="user" leftSection={<IconUser stroke={1.5} size={16} />}>
          <Group gap="sm">
            {t("permission.tab.user")}
            <Badge size="sm" variant="light">
              {userCount ?? query.data.users.length}
            </Badge>
          </Group>
        </Tabs.Tab>
        <Tabs.Tab value="group" leftSection={<IconUsersGroup stroke={1.5} size={16} />}>
          <Group gap="sm">
            {t("permission.tab.group")}
            <Badge size="sm" variant="light">
              {groupCount ?? query.data.groups.length}
            </Badge>
          </Group>
        </Tabs.Tab>
        <Tabs.Tab value="inherited" leftSection={<IconUserDown stroke={1.5} size={16} />}>
          <Group gap="sm">
            {t("permission.tab.inherited")}
            <Badge size="sm" variant="light">
              {query.data.inherited.length}
            </Badge>
          </Group>
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="user">
        <GrantEditor kind="user" integrationId={integrationId} initial={query.data} onCountChange={setUserCount} />
      </Tabs.Panel>
      <Tabs.Panel value="group">
        <GrantEditor kind="group" integrationId={integrationId} initial={query.data} onCountChange={setGroupCount} />
      </Tabs.Panel>
      <Tabs.Panel value="inherited">
        <InheritedGrants grants={query.data} />
      </Tabs.Panel>
    </Tabs>
  );
}

function GrantEditor({
  kind,
  integrationId,
  initial,
  onCountChange,
}: {
  kind: "user" | "group";
  integrationId: string;
  initial: IntegrationGrants;
  onCountChange: (count: number) => void;
}) {
  const t = useI18n();
  const { client, readOnly, notify } = useIntegrationFeature();
  const availability = useIntegrationAction("grants");
  const held = availability.state === "held";
  const key = useIntegrationQueryKey();
  const invalidate = useInvalidateIntegrations();
  const requests = useIntegrationRequestGeneration();
  const [selected, setSelected] = useState<string | null>(null);
  const [grants, setGrants] = useState<Grant[]>(() =>
    kind === "user"
      ? initial.users.map(({ user, permission }) => ({ principalId: user.id, permission }))
      : initial.groups.map(({ group, permission }) => ({ principalId: group.id, permission })),
  );
  const users = useQuery({
    queryKey: [...key, "principals", "users"],
    queryFn: ({ signal }) => client.user.selectable(undefined, { signal }),
    enabled: kind === "user",
    retry: false,
  });
  const groups = useQuery({
    queryKey: [...key, "principals", "groups"],
    queryFn: ({ signal }) => client.group.selectable(undefined, { signal }),
    enabled: kind === "group",
    retry: false,
  });
  const directory: PrincipalOption[] =
    kind === "user"
      ? [...initial.users.map((entry) => entry.user), ...(users.data ?? [])]
      : [...initial.groups.map((entry) => entry.group), ...(groups.data ?? [])];
  const principals = new Map(directory.map((principal) => [principal.id, principal]));
  const available = [...principals.values()].filter(
    (principal) => !grants.some((grant) => grant.principalId === principal.id),
  );
  const directoryQuery = kind === "user" ? users : groups;
  const save = useMutation({
    mutationFn: ({ permissions }: { permissions: Grant[]; generation: number }) =>
      kind === "user"
        ? client.integration.saveUserIntegrationPermissions({ entityId: integrationId, permissions })
        : client.integration.saveGroupIntegrationPermissions({ entityId: integrationId, permissions }),
    retry: false,
    onSuccess: (_, { generation }) => {
      void invalidate();
      if (!requests.isCurrent(generation)) return;
      notify({
        color: "green",
        title: t("common.notification.update.success"),
        message: t("integration.page.edit.notification.success.message"),
      });
    },
    onError: (_, { generation }) => {
      if (!requests.isCurrent(generation)) return;
      notify({
        color: "red",
        title: t("common.notification.update.error"),
        message: t("integration.page.edit.notification.error.message"),
      });
    },
  });
  const disabled = readOnly || save.isPending;
  const permissionData = integrationPermissions.map((permission) => ({
    value: permission,
    label: t(`integration.permission.${permission}`),
  }));
  const changeGrants = (next: Grant[]) => {
    setGrants(next);
    onCountChange(next.length);
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (disabled || held) return;
        const validation = integrationSavePermissionsSchema.safeParse({ entityId: integrationId, permissions: grants });
        if (validation.success) save.mutate({ permissions: validation.data.permissions, generation: requests.begin() });
      }}
    >
      <Stack pt="sm">
        <IntegrationActionHold availability={availability} />
        <Table.ScrollContainer minWidth={400}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t(`permission.field.${kind}.label`)}</Table.Th>
                <Table.Th>{t("permission.field.permission.label")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {grants.map((grant, index) => {
                const principal = principals.get(grant.principalId);
                const Icon = permissionIcons[grant.permission];
                return (
                  <Table.Tr key={grant.principalId}>
                    <Table.Td>
                      <PrincipalLabel kind={kind} principal={principal ?? { id: grant.principalId, name: null }} />
                    </Table.Td>
                    <Table.Td>
                      <Group wrap="nowrap">
                        <Select<IntegrationPermission>
                          flex={1}
                          allowDeselect={false}
                          variant="unstyled"
                          value={grant.permission}
                          data={permissionData}
                          aria-label={t("permission.field.permission.label")}
                          disabled={disabled}
                          leftSection={<Icon size={16} />}
                          onChange={(permission) => {
                            if (permission)
                              changeGrants(
                                grants.map((entry, position) =>
                                  position === index ? { ...entry, permission } : entry,
                                ),
                              );
                          }}
                        />
                        <Button
                          size="xs"
                          variant="subtle"
                          disabled={disabled}
                          onClick={() => changeGrants(grants.filter((_, position) => position !== index))}
                        >
                          {t("common.action.remove")}
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
        {directoryQuery.isError && <IntegrationLoadError retry={() => void directoryQuery.refetch()} />}
        <Group justify="space-between" align="end">
          <Group align="end" flex={1}>
            <Select
              flex={1}
              searchable
              clearable
              label={t(kind === "user" ? "user.action.select.label" : "group.action.select.label")}
              value={selected}
              onChange={setSelected}
              disabled={disabled || directoryQuery.isPending || directoryQuery.isError}
              data={available.map((principal) => ({
                value: principal.id,
                label: principal.name ?? principal.email ?? principal.id,
              }))}
              nothingFoundMessage={t("common.noResults")}
              renderOption={({ option }) => {
                const principal = principals.get(option.value);
                return (
                  <Group gap="xs">
                    {kind === "user" && <Avatar src={principal?.image} size="xs" />}
                    <Stack gap={0}>
                      <Text size="sm">{option.label}</Text>
                      {principal?.email && (
                        <Text size="xs" c="dimmed">
                          {principal.email}
                        </Text>
                      )}
                    </Stack>
                  </Group>
                );
              }}
            />
            <Button
              variant="light"
              disabled={disabled || !selected}
              onClick={() => {
                if (!selected || grants.some((grant) => grant.principalId === selected)) return;
                changeGrants([{ principalId: selected, permission: "use" }, ...grants]);
                setSelected(null);
              }}
            >
              {t("common.action.add")}
            </Button>
          </Group>
          <Button type="submit" disabled={readOnly || held} loading={save.isPending}>
            {t(kind === "user" ? "permission.action.saveUser" : "permission.action.saveGroup")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}

const permissionIcons = { use: IconSelector, interact: IconPlayerPlay, full: IconSettings };

function PrincipalLabel({ principal, kind }: { principal: PrincipalOption; kind: "user" | "group" }) {
  return (
    <Group wrap="nowrap">
      {kind === "user" && <Avatar src={principal.image} size="sm" />}
      <Anchor
        href={
          kind === "user"
            ? `/manage/users/${encodeURIComponent(principal.id)}`
            : `/manage/users/groups/${encodeURIComponent(principal.id)}`
        }
        size="sm"
      >
        {principal.name ?? principal.email ?? principal.id}
      </Anchor>
    </Group>
  );
}

function InheritedGrants({ grants }: { grants: IntegrationGrants }) {
  const t = useI18n();
  const strongest = new Map<string, IntegrationGrants["inherited"][number]>();
  for (const entry of grants.inherited) {
    const current = strongest.get(entry.group.id);
    if (!current || getPermissionsWithChildren([entry.permission]).includes(current.permission))
      strongest.set(entry.group.id, entry);
  }
  return (
    <Table mt="sm">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>{t("permission.field.group.label")}</Table.Th>
          <Table.Th>{t("permission.field.permission.label")}</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {[...strongest.values()].map(({ group, permission }) => {
          const children = getPermissionsWithChildren([permission]);
          const mapped = [...integrationPermissions]
            .reverse()
            .find((candidate) => children.includes(integrationPermissionsMap[candidate]));
          if (!mapped) return null;
          const Icon = permissionIcons[mapped];
          return (
            <Table.Tr key={group.id}>
              <Table.Td>
                <PrincipalLabel principal={group} kind="group" />
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <Icon size={16} />
                  <Text size="sm">{t(`integration.permission.${mapped}`)}</Text>
                </Group>
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
