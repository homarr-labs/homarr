"use client";

import { Avatar, Badge, Button, Card, Group, Stack, Table, Text, Title } from "@mantine/core";
import { IconRefresh, IconSearch } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

export const DockerDiscoveryPanel = () => {
  const tDiscovery = useScopedI18n("docker.discovery" as never) as unknown as (
    key: string,
    values?: Record<string, unknown>,
  ) => string;
  const { data: preview, refetch, isLoading: isLoadingPreview, isFetched } =
    clientApi.docker.getDiscoveredPreview.useQuery(undefined, {
      enabled: false,
    });
  const { mutate: syncDiscovery, isPending: isSyncing } = clientApi.docker.syncDiscovery.useMutation({
    onSuccess(result) {
      showSuccessNotification({
        title: tDiscovery("sync.notification.success.title"),
        message: tDiscovery("sync.notification.success.message", {
          created: result.created,
          updated: result.updated,
        }),
      });
      void refetch();
    },
    onError() {
      showErrorNotification({
        title: tDiscovery("sync.notification.error.title"),
        message: tDiscovery("sync.notification.error.message"),
      });
    },
  });

  const services = preview ?? [];

  return (
    <Card withBorder>
      <Stack>
        <Group justify="space-between">
          <Title order={3}>{tDiscovery("title")}</Title>
          <Group gap="xs">
            <Button
              variant="light"
              leftSection={<IconSearch size={16} />}
              loading={isLoadingPreview}
              onClick={() => refetch()}
            >
              {tDiscovery("preview.label")}
            </Button>
            <Button
              leftSection={<IconRefresh size={16} />}
              loading={isSyncing}
              onClick={() => syncDiscovery()}
              disabled={services.length === 0}
            >
              {tDiscovery("sync.label")}
            </Button>
          </Group>
        </Group>

        {!isFetched ? (
          <Text c="dimmed" ta="center" py="xl">
            {tDiscovery("preview.idle")}
          </Text>
        ) : services.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            {tDiscovery("preview.empty")}
          </Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{tDiscovery("field.name")}</Table.Th>
                <Table.Th>{tDiscovery("field.group")}</Table.Th>
                <Table.Th>{tDiscovery("field.href")}</Table.Th>
                <Table.Th>{tDiscovery("field.host")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {services.map((service) => (
                <Table.Tr key={`${service.host}/${service.containerId}`}>
                  <Table.Td>
                    <Group gap="xs">
                      {service.icon && (
                        <Avatar size="sm" radius="sm" src={service.icon}>
                          {service.name.charAt(0)}
                        </Avatar>
                      )}
                      <Text size="sm">{service.name}</Text>
                      {service.integrationKind && (
                        <Badge size="xs" variant="light">
                          {service.integrationKind}
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="outline" size="sm">
                      {service.group}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" lineClamp={1}>
                      {service.href}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {service.host}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Card>
  );
};
