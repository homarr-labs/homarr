import type { ReactNode } from "react";
import { Button, Card, DEFAULT_THEME, Group, SimpleGrid, Stack, Table, Text, Title } from "@mantine/core";
import { IconAlertTriangle, IconCertificate, IconCertificateOff } from "@tabler/icons-react";

export interface CertificateListItemViewProps {
  readonly fileName: string;
  readonly title: string;
  readonly invalid: boolean;
  readonly expirationColor: "red" | "orange" | "yellow" | "green";
  readonly description: string;
  readonly validTo?: string;
  readonly removeAction: ReactNode;
}

export function CertificateListItemView(props: CertificateListItemViewProps) {
  return (
    <Card>
      <Group wrap="nowrap">
        {props.invalid ? (
          <IconAlertTriangle color={DEFAULT_THEME.colors.red[6]} style={{ minWidth: 32 }} size={32} stroke={1.5} />
        ) : (
          <IconCertificate
            color={DEFAULT_THEME.colors[props.expirationColor][6]}
            style={{ minWidth: 32 }}
            size={32}
            stroke={1.5}
          />
        )}
        <Stack flex={1} gap="xs" maw="calc(100% - 48px)">
          <Group justify="space-between" wrap="nowrap">
            <Text fw={500} lineClamp={1} style={{ wordBreak: "break-all" }}>
              {props.title}
            </Text>
            <Text c="gray.6" ta="end" size="sm">
              {props.fileName}
            </Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="gray.6" title={props.validTo}>
              {props.description}
            </Text>
            {props.removeAction}
          </Group>
        </Stack>
      </Group>
    </Card>
  );
}

export function CertificateNoResultsView({ title }: { readonly title: string }) {
  return (
    <Card bg="transparent" withBorder={false}>
      <Stack align="center" gap="sm">
        <IconCertificateOff size="2rem" />
        <Text fw={500} size="lg">
          {title}
        </Text>
      </Stack>
    </Card>
  );
}

export interface CertificatesManagementViewProps {
  readonly breadcrumb?: ReactNode;
  readonly title: string;
  readonly description: string;
  readonly hostnamesLabel: string;
  readonly onHostnames: () => void;
  readonly addSection: ReactNode;
  readonly emptyTitle: string;
  readonly entries: readonly CertificateListItemViewProps[];
}

export function CertificatesManagementView(props: CertificatesManagementViewProps) {
  return (
    <>
      {props.breadcrumb}
      <Stack>
        <Group justify="space-between">
          <Stack gap={4}>
            <Title>{props.title}</Title>
            <Text>{props.description}</Text>
          </Stack>
          <Group>
            <Button type="button" variant="default" onClick={props.onHostnames}>
              {props.hostnamesLabel}
            </Button>
          </Group>
        </Group>
        {props.addSection}
        {props.entries.length === 0 && <CertificateNoResultsView title={props.emptyTitle} />}
        <SimpleGrid cols={{ sm: 1, lg: 2, xl: 3 }} spacing="lg">
          {props.entries.map((entry) => (
            <CertificateListItemView key={entry.fileName} {...entry} />
          ))}
        </SimpleGrid>
      </Stack>
    </>
  );
}

export interface TrustedHostnamesManagementViewProps {
  readonly breadcrumb?: ReactNode;
  readonly title: string;
  readonly description: string;
  readonly certificatesLabel: string;
  readonly onCertificates: () => void;
  readonly emptyTitle: string;
  readonly columns: { readonly hostname: string; readonly subject: string; readonly fingerprint: string };
  readonly entries: readonly {
    readonly hostname: string;
    readonly subject: string | null;
    readonly thumbprint: string;
    readonly removeAction: ReactNode;
  }[];
}

export function TrustedHostnamesManagementView(props: TrustedHostnamesManagementViewProps) {
  return (
    <>
      {props.breadcrumb}
      <Stack>
        <Group justify="space-between">
          <Stack gap={4}>
            <Title>{props.title}</Title>
            <Text>{props.description}</Text>
          </Stack>
          <Button type="button" variant="default" onClick={props.onCertificates}>
            {props.certificatesLabel}
          </Button>
        </Group>
        {props.entries.length === 0 && <CertificateNoResultsView title={props.emptyTitle} />}
        {props.entries.length >= 1 && (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{props.columns.hostname}</Table.Th>
                <Table.Th>{props.columns.subject}</Table.Th>
                <Table.Th>{props.columns.fingerprint}</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {props.entries.map((entry) => (
                <Table.Tr key={`${entry.hostname}-${entry.thumbprint}`}>
                  <Table.Td>{entry.hostname}</Table.Td>
                  <Table.Td>{entry.subject}</Table.Td>
                  <Table.Td>{entry.thumbprint}</Table.Td>
                  <Table.Td>
                    <Group justify="end">{entry.removeAction}</Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </>
  );
}
