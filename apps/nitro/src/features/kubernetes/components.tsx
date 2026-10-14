import { Alert, Badge, Button, Group, Skeleton, Stack, Table, Text, TextInput } from "@mantine/core";
import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";

import { toKubernetesReadError } from "./errors";
import type { KubernetesTableModel } from "./models";
import { filterKubernetesRows, kubernetesStatusColor } from "./models";

export function KubernetesReadContent<T>({
  query,
  label,
  children,
}: {
  query: UseQueryResult<T, Error>;
  label: string;
  children(data: T): ReactNode;
}) {
  if (query.isError) {
    return (
      <Alert color="red" title={`${label} could not be loaded`} role="alert">
        <Stack gap="sm">
          <Text size="sm">{toKubernetesReadError(query.error).message}</Text>
          <Button
            variant="light"
            color="red"
            size="xs"
            w="fit-content"
            loading={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Retry load
          </Button>
        </Stack>
      </Alert>
    );
  }
  if (query.isPending) {
    if (query.fetchStatus === "paused") {
      return (
        <Alert title={`${label} is waiting for a connection`}>Loading will resume when the connection returns.</Alert>
      );
    }
    return (
      <Stack gap="sm" aria-busy="true">
        <Text component="output" size="sm">
          Loading {label.toLowerCase()}…
        </Text>
        <Skeleton height={36} />
        <Skeleton height={100} />
        <Skeleton height={100} />
      </Stack>
    );
  }
  return (
    <Stack gap="sm" aria-busy={query.isFetching}>
      {query.isFetching && (
        <Text component="output" size="sm">
          Updating {label.toLowerCase()}…
        </Text>
      )}
      {query.fetchStatus === "paused" && (
        <Alert>Updates are waiting for a connection. Showing the last loaded data.</Alert>
      )}
      {children(query.data)}
    </Stack>
  );
}

export function KubernetesStatus({ value }: { value: string }) {
  return (
    <Badge color={kubernetesStatusColor(value)} variant="light" style={{ textTransform: "none" }}>
      {value}
    </Badge>
  );
}

export function KubernetesTable({ model }: { model: KubernetesTableModel }) {
  const [search, setSearch] = useState("");
  const rows = filterKubernetesRows(model.rows, search);
  return (
    <Stack gap="sm">
      <Group justify="space-between" align="end">
        <Text component="output" size="sm">
          {rows.length} of {model.rows.length} resources
        </Text>
        <TextInput
          label={`Search ${model.title.toLowerCase()}`}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          style={{ flex: "0 1 320px", minWidth: 0 }}
        />
      </Group>
      {model.rows.length === 0 ? (
        <Alert title={`No ${model.title.toLowerCase()} returned`}>
          {model.scope === "all-namespaces"
            ? "The selected context returned an empty inventory across all namespaces."
            : "The selected context returned an empty inventory."}
        </Alert>
      ) : rows.length === 0 ? (
        <Alert title="No matching resources">Change the search text to see resources in this inventory.</Alert>
      ) : (
        <Table.ScrollContainer minWidth={model.headings.length > 5 ? 900 : 540} type="native">
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Caption>
              {model.title}
              {model.scope === "all-namespaces" ? ", all namespaces" : ""}
            </Table.Caption>
            <Table.Thead>
              <Table.Tr>
                {model.headings.map((heading) => (
                  <Table.Th key={heading} scope="col">
                    {heading}
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((row) => (
                <Table.Tr key={row.key}>
                  {row.cells.map((cell, index) => (
                    <Table.Td
                      key={model.headings[index]}
                      style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxWidth: 360 }}
                    >
                      {index === model.statusColumn ? <KubernetesStatus value={cell} /> : cell}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Stack>
  );
}
